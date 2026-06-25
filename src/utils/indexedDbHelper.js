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

      // Save text metadata + photo URLs (never binary File/Blob objects).
      // Photos are now Supabase URLs (strings) thanks to progressive upload,
      // so we can safely persist them without any memory cost.
      const textOnlyDraft = {
        type: draftData.type,
        vehiclePlate: draftData.vehiclePlate,
        date: draftData.date,
        time: draftData.time,
        km: draftData.km,
        fuelLevel: draftData.fuelLevel,
        tireCondition: draftData.tireCondition,
        externalCleanliness: draftData.externalCleanliness,
        internalCleanliness: draftData.internalCleanliness,
        lastOilChangeDate: draftData.lastOilChangeDate,
        lastOilChangeKm: draftData.lastOilChangeKm,
        nextOilChangeKm: draftData.nextOilChangeKm,
        observations: draftData.observations,
        hasDamages: draftData.hasDamages,
        // Damages: save description and URL (no binaries)
        damages: (draftData.damages || []).map(d => ({
          id: d.id,
          description: d.description,
          // Only persist photo if it's a URL (not a blob:// or binary)
          photo: d.photo?.preview && !d.photo.preview.startsWith('blob:')
            ? { preview: d.photo.preview }
            : null
        })),
        // Deductions: text/numbers only — safe to store as-is
        deductions: draftData.deductions || [],
        // Photos: only save URLs (slots uploaded to Supabase), ignore blob: URLs
        photos: Object.fromEntries(
          Object.entries(draftData.photos || {})
            .filter(([, v]) => v?.preview && !v.preview.startsWith('blob:'))
            .map(([k, v]) => [k, { preview: v.preview }])
        ),
        // Additional photos: only save confirmed Supabase URLs
        additionalPhotos: (draftData.additionalPhotos || [])
          .filter(p => p.preview && !p.preview.startsWith('blob:') && !p.uploading)
          .map(p => ({ id: p.id, preview: p.preview })),
        video: null,
      };

      const request = store.put(textOnlyDraft, DRAFT_KEY);
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
        // Draft now contains only text metadata (no binary files).
        // Ensure photos/additionalPhotos/video are always empty objects/arrays.
        draft.photos = {};
        draft.additionalPhotos = [];
        draft.video = null;
        if (draft.damages) {
          draft.damages = draft.damages.map(d => ({ ...d, photo: null }));
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
