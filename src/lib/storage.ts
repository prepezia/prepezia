import { FirebaseStorage, ref, uploadString, getDownloadURL, deleteObject, listAll } from 'firebase/storage';

// Helper to get file size from data URL
export function getDataUrlSize(dataUrl: string): number {
    try {
        const base64Data = dataUrl.split(',')[1] || '';
        // Base64 length * 0.75 gives approximate byte size
        return Math.round(base64Data.length * 0.75);
    } catch {
        return 0;
    }
}

// Helper to validate data URL
export function isValidDataUrl(dataUrl: string): boolean {
    if (!dataUrl || typeof dataUrl !== 'string') return false;
    if (!dataUrl.startsWith('data:')) return false;
    
    try {
        const [header] = dataUrl.split(',');
        if (!header.includes(';base64')) return false;
        return true;
    } catch {
        return false;
    }
}


// Helper to upload a data URL string to Firebase Storage with timeout and retry
export async function uploadDataUrlToStorage(
    storage: FirebaseStorage, 
    path: string, 
    dataUrl: string,
    maxRetries = 3
): Promise<string> {
    const estimatedSize = getDataUrlSize(dataUrl);
    console.log(`[Storage] Starting upload to: ${path}. Estimated size: ${(estimatedSize / 1024).toFixed(2)} KB`);
    
    // Validate input
    if (!isValidDataUrl(dataUrl)) {
        throw new Error(`Invalid Data URL. Must be a non-empty string starting with "data:...;base64,".`);
    }

    let lastError: Error | null = null;
    
    // Retry loop
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[Storage] Upload attempt ${attempt}/${maxRetries}`);
            
            const storageRef = ref(storage, path);
            
            // Create upload promise with a longer timeout
            const uploadPromise = uploadString(storageRef, dataUrl, 'data_url');
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error(`Upload attempt ${attempt} timed out after 120 seconds`)), 120000); // Increased to 2 minutes
            });

            console.log(`[Storage] Racing upload against ${120}s timeout...`);
            const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
            
            console.log(`[Storage] Upload successful on attempt ${attempt}, getting download URL...`);
            
            const downloadUrl = await getDownloadURL(snapshot.ref);
            console.log(`[Storage] Download URL obtained: ${downloadUrl}`);
            
            return downloadUrl;
            
        } catch (error: any) {
            lastError = error;
            
            // Detailed error logging
            console.error(`[Storage] Upload attempt ${attempt} failed:`, {
                error: error,
                message: error.message,
                code: error.code,
                name: error.name,
                path: path
            });

            // Don't retry on certain errors
            if (error.code === 'storage/unauthorized' || error.code === 'storage/invalid-format') {
                throw new Error(`Upload failed with non-retriable error: ${error.message}`);
            }
            
            // Wait before retrying (exponential backoff)
            if (attempt < maxRetries) {
                const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                console.log(`[Storage] Waiting ${waitTime}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    // All retries failed
    const errorMessage = lastError?.message || 'Unknown error';
    const errorCode = (lastError as any)?.code;
    
    // Handle specific Firebase Storage errors
    if (errorCode === 'storage/unauthorized') {
        throw new Error('Permission denied: You do not have access to upload to this location.');
    } else if (errorCode === 'storage/canceled') {
        throw new Error('Upload was canceled.');
    } else if (errorCode === 'storage/unknown') {
        throw new Error('An unknown error occurred during upload. Please check your network connection.');
    } else if (errorMessage.includes('timeout')) {
        throw new Error('Upload timed out. The file might be too large or your connection is slow.');
    }
    
    throw new Error(`Failed to upload to storage after ${maxRetries} attempts: ${errorMessage}`);
}

// Helper to delete a folder and its contents with better error handling
export async function deleteFolderFromStorage(storage: FirebaseStorage, path: string) {
    try {
        console.log(`[Storage] Deleting folder contents: ${path}`);
        const folderRef = ref(storage, path);
        
        // Check if folder exists by listing contents
        let listResults;
        try {
            listResults = await listAll(folderRef);
        } catch (listError: any) {
            if (listError.code === 'storage/object-not-found') {
                console.log(`[Storage] Folder does not exist: ${path}`);
                return; // Folder doesn't exist, nothing to delete
            }
            throw listError;
        }
        
        if (listResults.items.length === 0) {
            console.log(`[Storage] No files found in folder: ${path}`);
            return;
        }

        console.log(`[Storage] Found ${listResults.items.length} files to delete`);
        
        const deleteResults = await Promise.allSettled(
            listResults.items.map(async (itemRef) => {
                try {
                    await deleteObject(itemRef);
                    console.log(`[Storage] Deleted: ${itemRef.fullPath}`);
                    return { success: true, path: itemRef.fullPath };
                } catch (itemError) {
                    console.error(`[Storage] Failed to delete ${itemRef.fullPath}:`, itemError);
                    return { success: false, path: itemRef.fullPath, error: itemError };
                }
            })
        );
        
        const failed = deleteResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
        if (failed.length > 0) {
            console.warn(`[Storage] ${failed.length} files failed to delete`);
        } else {
            console.log(`[Storage] Successfully deleted all files in: ${path}`);
        }
        
    } catch (error) {
        console.error(`[Storage] Failed to delete folder ${path}:`, error);
        // Don't re-throw, as we don't want to block UI deletion if storage deletion fails
    }
}
