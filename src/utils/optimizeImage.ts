const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Convert large mobile camera images to bounded JPEG data URLs for onboarding JSON. */
export async function optimizeImageToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('This image format cannot be opened by this browser. Save it as JPEG or PNG and try again.');
  }

  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser cannot process the selected image.');

    let blob: Blob | null = null;
    for (const maxDimension of [1920, 1600, 1280, 960, 720]) {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.84, 0.72, 0.60, 0.48, 0.38]) {
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (blob && blob.size <= MAX_IMAGE_BYTES) break;
      }
      if (blob && blob.size <= MAX_IMAGE_BYTES) break;
    }

    if (!blob || blob.size > MAX_IMAGE_BYTES) {
      throw new Error('This image could not be reduced to 2 MB. Retake the photo closer to the document and try again.');
    }

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Could not read the prepared image.'));
      reader.onerror = () => reject(new Error('Could not read the prepared image.'));
      reader.readAsDataURL(blob);
    });
  } finally {
    bitmap.close();
  }
}
