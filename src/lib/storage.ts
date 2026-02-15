

import { FirebaseStorage, ref, uploadString, getDownloadURL, deleteObject, listAll } from 'firebase/storage';

// Helper to upload a data URL string to Firebase Storage
export async function uploadDataUrlToStorage(storage: FirebaseStorage, path: string, dataUrl: string): Promise<string> {
    try {
        console.log(`Starting upload to: ${path}`);
        console.log(`Data URL length: ${dataUrl.length}, starts with: ${dataUrl.substring(0, 50)}...`);
        
        if (!dataUrl || typeof dataUrl !== 'string') {
            throw new Error('Invalid dataUrl: must be a non-empty string');
        }
        
        if (!dataUrl.startsWith('data:')) {
            throw new Error(`Invalid Data URL. Must start with "data:". Actual: ${dataUrl.substring(0, 30)}...`);
        }

        const storageRef = ref(storage, path);
        console.log('Uploading to Firebase Storage...');
        
        const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
        console.log('Upload successful, getting download URL...');
        
        const downloadUrl = await getDownloadURL(snapshot.ref);
        console.log(`Download URL obtained: ${downloadUrl}`);
        
        return downloadUrl;
    } catch (error) {
        console.error('Storage upload error details:', {
            error,
            path,
            dataUrlPreview: dataUrl?.substring(0, 100),
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined
        });
        throw new Error(`Failed to upload to storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Helper to delete a folder and its contents
export async function deleteFolderFromStorage(storage: FirebaseStorage, path: string) {
    try {
        const folderRef = ref(storage, path);
        const listResults = await listAll(folderRef);
        
        const deletePromises = listResults.items.map(itemRef => deleteObject(itemRef));
        await Promise.all(deletePromises);

        // Note: Storage doesn't have "folders" in the traditional sense. This deletes all files
        // within the specified prefix. The "folder" will disappear once all files are gone.
    } catch (error) {
        console.error(`Failed to delete folder ${path}:`, error);
        // Don't re-throw, as we don't want to block UI deletion if storage deletion fails
    }
}
