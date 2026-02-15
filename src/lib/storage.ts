import { FirebaseStorage, ref, uploadString, getDownloadURL, deleteObject, listAll, uploadBytes } from 'firebase/storage';

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


// Helper to upload a data URL string to Firebase Storage by converting it to a Blob
export async function uploadDataUrlToStorage(
    storage: FirebaseStorage, 
    path: string, 
    dataUrl: string,
    maxRetries = 1
): Promise<string> {
    const estimatedSize = getDataUrlSize(dataUrl);
    console.log(`[Storage] Starting upload to: ${path}. Estimated size: ${(estimatedSize / 1024).toFixed(2)} KB`);
    
    if (!isValidDataUrl(dataUrl)) {
        throw new Error(`Invalid Data URL. Must be a non-empty string starting with "data:...;base64,".`);
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[Storage] Upload attempt ${attempt}/${maxRetries}`);

            // Convert data URL to Blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            console.log(`[Storage] Converted data URL to Blob. Blob size: ${(blob.size / 1024).toFixed(2)} KB, Type: ${blob.type}`);

            const storageRef = ref(storage, path);
            
            // Using uploadBytes which is better for file-like objects (Blobs)
            const snapshot = await uploadBytes(storageRef, blob);
            console.log(`[Storage] Upload successful on attempt ${attempt}. Getting download URL...`);

            const downloadUrl = await getDownloadURL(snapshot.ref);
            console.log(`[Storage] Download URL obtained: ${downloadUrl}`);
            
            return downloadUrl;
            
        } catch (error: any) {
            lastError = error;
            console.error(`[Storage] Upload attempt ${attempt} failed:`, {
                error,
                message: error.message,
                code: error.code,
                name: error.name,
                path: path
            });
            if (attempt < maxRetries) {
                const waitTime = Math.pow(2, attempt) * 1000;
                console.log(`[Storage] Waiting ${waitTime}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    // All retries failed
    const errorMessage = lastError?.message || 'Unknown error';
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
