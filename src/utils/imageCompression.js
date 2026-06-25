/**
 * Compress an image file using Canvas API.
 * Keeps memory usage minimal: uses smaller max dimensions and
 * explicitly nulls out canvas references to help GC.
 * @param {File} file - The original image file.
 * @param {Object} options - Compression options.
 * @returns {Promise<File>} - The compressed image file.
 */
export const compressImage = async (file, options = { maxWidth: 1024, quality: 0.55 }) =>{
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      // Calculate new dimensions keeping aspect ratio
      if (width > height) {
        if (width > options.maxWidth) {
          height = Math.round(height * options.maxWidth / width);
          width = options.maxWidth;
        }
      } else {
        if (height > options.maxWidth) {
          width = Math.round(width * options.maxWidth / height);
          height = options.maxWidth;
        }
      }

      // Safety cap: never exceed 1024px on any side
      const safeCap = 1024;
      if (width > safeCap) {
        height = Math.round(height * safeCap / width);
        width = safeCap;
      }
      if (height > safeCap) {
        width = Math.round(width * safeCap / height);
        height = safeCap;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          // Free canvas memory immediately after blob is produced
          canvas.width = 0;
          canvas.height = 0;

          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          const compressedFile = new File([blob], file.name || 'photo.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/jpeg',
        options.quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
};

