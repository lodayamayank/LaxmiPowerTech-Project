// Image Compression Utility
// Compresses images before upload to reduce file size and improve upload speed

/**
 * Compress an image file
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<File>} - Compressed image file
 */
export const compressImage = async (file, options = {}) => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    mimeType = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob conversion failed'));
              return;
            }

            // Create new file from blob
            const compressedFile = new File([blob], file.name, {
              type: mimeType,
              lastModified: Date.now()
            });

            resolve(compressedFile);
          },
          mimeType,
          quality
        );
      };

      img.onerror = () => reject(new Error('Image loading failed'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsDataURL(file);
  });
};

/**
 * Get file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Calculate compression ratio
 * @param {number} originalSize - Original file size
 * @param {number} compressedSize - Compressed file size
 * @returns {number} - Compression ratio percentage
 */
export const getCompressionRatio = (originalSize, compressedSize) => {
  return Math.round(((originalSize - compressedSize) / originalSize) * 100);
};

/**
 * Validate image file
 * @param {File} file - File to validate
 * @returns {Object} - Validation result
 */
export const validateImageFile = (file) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload JPG, PNG, or WebP images.' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit.' };
  }

  return { valid: true };
};

/**
 * Compress image with progress callback
 * @param {File} file - Image file to compress
 * @param {Function} onProgress - Progress callback
 * @param {Object} options - Compression options
 * @returns {Promise<Object>} - Compression result with stats
 */
export const compressImageWithStats = async (file, onProgress, options = {}) => {
  try {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (onProgress) onProgress(10);

    const originalSize = file.size;

    if (onProgress) onProgress(30);

    // Compress image
    const compressedFile = await compressImage(file, options);

    if (onProgress) onProgress(80);

    const compressedSize = compressedFile.size;
    const ratio = getCompressionRatio(originalSize, compressedSize);

    if (onProgress) onProgress(100);

    return {
      success: true,
      file: compressedFile,
      originalSize,
      compressedSize,
      originalSizeFormatted: formatFileSize(originalSize),
      compressedSizeFormatted: formatFileSize(compressedSize),
      compressionRatio: ratio,
      saved: formatFileSize(originalSize - compressedSize)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  compressImage,
  formatFileSize,
  getCompressionRatio,
  validateImageFile,
  compressImageWithStats
};
