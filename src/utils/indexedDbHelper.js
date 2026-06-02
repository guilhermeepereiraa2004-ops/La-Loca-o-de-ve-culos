const DB_NAME = 'InspectionDraftsDB';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';
const DRAFT_KEY = 'current_inspection_draft';

export const openDb = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

export const saveDraft = async (draftData) => {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      // Deep clone metadata but filter out files to prevent stringify error
      const cleanDraft = JSON.parse(JSON.stringify(draftData, (key, value) => {
        if (value instanceof File || value instanceof Blob) {
          return undefined; // Handled separately
        }
        return value;
      }));

      // Persist binary files by re-attaching actual File/Blob objects
      // 1. Slot photos
      if (draftData.photos) {
        cleanDraft.photos = {};
        Object.keys(draftData.photos).forEach(key => {
          if (draftData.photos[key] && draftData.photos[key].file) {
            cleanDraft.photos[key] = {
              file: draftData.photos[key].file
            };
          }
        });
      }
      
      // 2. Additional photos
      if (draftData.additionalPhotos) {
        cleanDraft.additionalPhotos = draftData.additionalPhotos.map(p => ({
          id: p.id,
          file: p.file
        })).filter(p => p.file);
      }

      // 3. Video
      if (draftData.video && draftData.video.file) {
        cleanDraft.video = {
          file: draftData.video.file
        };
      }

      // 4. Damages
      if (draftData.damages) {
        cleanDraft.damages = draftData.damages.map(d => ({
          id: d.id,
          description: d.description,
          photo: d.photo // binary File
        }));
      }

      const request = store.put(cleanDraft, DRAFT_KEY);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("IndexedDB Save Draft Error:", err);
  }
};

export const getDraft = async () => {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(DRAFT_KEY);
      request.onsuccess = (e) => {
        const draft = e.target.result;
        if (!draft) {
          resolve(null);
          return;
        }

        // Reconstruct preview URLs for restored Files
        if (draft.photos) {
          Object.keys(draft.photos).forEach(key => {
            if (draft.photos[key] && draft.photos[key].file) {
              draft.photos[key].preview = URL.createObjectURL(draft.photos[key].file);
            }
          });
        }
        
        if (draft.additionalPhotos) {
          draft.additionalPhotos.forEach(p => {
            if (p.file) {
              p.preview = URL.createObjectURL(p.file);
            }
          });
        }

        if (draft.video && draft.video.file) {
          draft.video.preview = URL.createObjectURL(draft.video.file);
        }

        if (draft.damages) {
          draft.damages.forEach(d => {
            if (d.photo) {
              d.preview = URL.createObjectURL(d.photo);
            }
          });
        }

        resolve(draft);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("IndexedDB Get Draft Error:", err);
    return null;
  }
};

export const clearDraft = async () => {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(DRAFT_KEY);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("IndexedDB Clear Draft Error:", err);
  }
};
