import { Platform } from 'react-native';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from './supabase';

export const PRODUCT_IMAGES_BUCKET = 'product-images';

function extensionFromUri(uri: string, mimeType?: string | null): string {
  if (mimeType?.includes('png')) return 'png';
  if (mimeType?.includes('webp')) return 'webp';
  if (mimeType?.includes('gif')) return 'gif';

  const clean = uri.split('?')[0] ?? uri;
  const ext = clean.split('.').pop()?.toLowerCase();
  if (!ext || ext.length > 5 || ext.includes('/')) return 'jpg';
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
 * Read a local gallery URI (file://, content://, or blob:/data: on Web) into an ArrayBuffer.
 * On Web, fetch(localUri).arrayBuffer() works natively.
 * On Android/iOS, copy to FileSystem.cacheDirectory and decode Base64.
 */
async function readLocalImageAsArrayBuffer(localUri: string): Promise<ArrayBuffer> {
  if (
    Platform.OS === 'web' ||
    localUri.startsWith('blob:') ||
    localUri.startsWith('data:') ||
    localUri.startsWith('http://') ||
    localUri.startsWith('https://')
  ) {
    const res = await fetch(localUri);
    if (!res.ok) {
      throw new Error('Görsel tarayıcıdan okunamadı. Lütfen tekrar seçin.');
    }
    return await res.arrayBuffer();
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    // Fallback to fetch if cacheDirectory is unavailable
    const res = await fetch(localUri);
    return await res.arrayBuffer();
  }

  const tempPath = `${cacheDir}product-upload-${Date.now()}`;

  try {
    await FileSystem.copyAsync({ from: localUri, to: tempPath });
    const base64 = await FileSystem.readAsStringAsync(tempPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return decode(base64);
  } catch {
    throw new Error('Görsel okunamadı. Lütfen tekrar seçin.');
  } finally {
    await FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => undefined);
  }
}

/**
 * Upload a local image URI to `product-images`.
 * Path: `{store_id}/{product_id}/{timestamp}.{ext}`
 * Returns the public URL for `products.image_url`.
 */
export async function uploadProductImage(
  storeId: string,
  productId: string,
  localUri: string,
  mimeType?: string | null
): Promise<string> {
  const ext = extensionFromUri(localUri, mimeType);
  const contentType = mimeType?.startsWith('image/')
    ? mimeType
    : contentTypeFromExt(ext);
  const path = `${storeId}/${productId}/${Date.now()}.${ext}`;

  const arrayBuffer = await readLocalImageAsArrayBuffer(localUri);

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });

  if (error) throw error;

  return getPublicUrl(PRODUCT_IMAGES_BUCKET, path);
}

/** Remove a product image object by its storage path (optional cleanup). */
export async function deleteProductImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
  if (error) throw error;
}
