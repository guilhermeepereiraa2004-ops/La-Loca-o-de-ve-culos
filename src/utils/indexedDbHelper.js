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
        // Photos are stored as Supabase URLs — return them as-is.
        // Ensure defaults for fields that might be missing in older drafts.
        if (!draft.photos) draft.photos = {};
        if (!draft.additionalPhotos) draft.additionalPhotos = [];
        if (!draft.video) draft.video = null;
        // Damages: ensure photo objects have no leftover binary files
        if (draft.damages) {
          draft.damages = draft.damages.map(d => ({
            ...d,
            // Keep photo URL if present, otherwise null
            photo: d.photo?.preview ? { preview: d.photo.preview } : null
          }));
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
