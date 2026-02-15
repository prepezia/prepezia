
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
    dataUrl: string
): Promise<string> {
    const estimatedSize = getDataUrlSize(dataUrl);
    console.log(`[Storage] Starting upload to: ${path}. Estimated size: ${(estimatedSize / 1024).toFixed(2)} KB`);
    
    if (!isValidDataUrl(dataUrl)) {
        throw new Error(`[Storage] Invalid Data URL. Must be a non-empty string starting with "data:...;base64,".`);
    }

    try {
        console.log('[Storage] Converting data URL to Blob...');
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        console.log(`[Storage] Blob created. Size: ${(blob.size / 1024).toFixed(2)} KB, Type: ${blob.type}`);

        const storageRef = ref(storage, path);
        
        console.log('[Storage] Starting uploadBytes...');
        const snapshot = await uploadBytes(storageRef, blob);
        console.log('[Storage] uploadBytes complete. Getting download URL...');

        const downloadUrl = await getDownloadURL(snapshot.ref);
        console.log(`[Storage] Success! Download URL obtained: ${downloadUrl}`);
        
        return downloadUrl;
        
    } catch (error: any) {
        console.error('[Storage] Upload failed. Full error details:', {
            code: error.code,
            message: error.message,
            name: error.name,
            path: path,
            serverResponse: (error as any).serverResponse,
        });

        // Provide a more user-friendly error message
        if (error.code === 'storage/unauthorized') {
            throw new Error("Permission denied. Please check your Firebase Storage security rules and CORS configuration.");
        } else if (error.code === 'storage/object-not-found') {
            throw new Error("File path not found. This can sometimes be a permission issue.");
        } else {
             throw new Error(`Failed to upload to storage: ${error.message}`);
        }
    }
}

// Helper to delete a folder and its contents with better error handling
export async function deleteFolderFromStorage(storage: FirebaseStorage, path: string) {
    try {
        const folderRef = ref(storage, path);
        const listResults = await listAll(folderRef);
        
        const deletePromises = listResults.items.map(itemRef => deleteObject(itemRef));
        if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
            console.log(`[Storage] Successfully deleted all files in: ${path}`);
        } else {
            console.log(`[Storage] No files found to delete in: ${path}`);
        }
    } catch (error) {
        console.error(`[Storage] Failed to delete folder ${path}:`, error);
        // Don't re-throw, as we don't want to block UI deletion if storage deletion fails
    }
}
