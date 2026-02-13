
import { FirebaseStorage, ref, uploadString, getDownloadURL, deleteObject, listAll } from 'firebase/storage';

// Helper to upload a data URL string to Firebase Storage
export async function uploadDataUrlToStorage(storage: FirebaseStorage, path: string, dataUrl: string): Promise<string> {
    const storageRef = ref(storage, path);
    const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
    return await getDownloadURL(snapshot.ref);
}

// Helper to delete a folder and its contents
export async function deleteFolderFromStorage(storage: FirebaseStorage, path: string) {
    try {
        const folderRef = ref(storage, path);
        const listResults = await listAll(folderRef);
        
        const deletePromises = listResults.items.map(itemRef => deleteObject(itemRef));
        await Promise.all(deletePromises);
    } catch (error) {
        console.error(`Failed to delete folder ${path}:`, error);
        // Don't re-throw, as we don't want to block UI deletion if storage deletion fails
    }
}
