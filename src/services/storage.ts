import { supabase } from './supabase';

export const PRODUCT_IMAGES_BUCKET = 'product-images';

function extensionFromUri(uri: string): string {
  const clean = uri.split('?')[0] ?? uri;
  const ext = clean.split('.').pop()?.toLowerCase();
  if (!ext || ext.length > 5) return 'jpg';
  return ext;
}

function contentTypeFromExt(ext: string): string {
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}

/** Public URL for an object already in Storage. */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload a local image URI to `product-images`.
 * Path: `{store_id}/{product_id}/{timestamp}.{ext}`
 * Returns the public URL for `products.image_url`.
 */
export async function uploadProductImage(
  storeId: string,
  productId: string,
  localUri: string
): Promise<string> {
  const ext = extensionFromUri(localUri);
  const contentType = contentTypeFromExt(ext);
  const path = `${storeId}/${productId}/${Date.now()}.${ext}`;

  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error('Görsel okunamadı. Lütfen tekrar seçin.');
  }

  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, arrayBuffer, {
      contentType,
      upsert: true,
    });

  if (error) throw error;

  return getPublicUrl(PRODUCT_IMAGES_BUCKET, path);
}

/** Remove a product image object by its storage path (optional cleanup). */
export async function deleteProductImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
  if (error) throw error;
}
