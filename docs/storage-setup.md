# Supabase Storage Kurulumu (Ürün Görselleri)

Bu doküman **13. kısım** için `product-images` bucket kurulumunu açıklar. Uygulama kodu `src/services/storage.ts` üzerinden yükleme yapar.

## 1. Bucket oluştur

Supabase Dashboard → **Storage** → **New bucket**:

| Ayar | Değer |
|------|--------|
| Name | `product-images` |
| Public bucket | **Yes** (katalogda public URL gerekir) |
| File size limit | örn. 5 MB |
| Allowed MIME | `image/jpeg`, `image/png`, `image/webp` |

Yol yapısı (kod ile aynı):

```text
{store_id}/{product_id}/{timestamp}.{ext}
```

## 2. Storage politikaları (SQL Editor)

Aşağıdaki SQL’i Dashboard → **SQL Editor**’de çalıştır. Satıcı yalnızca kendi mağazasının klasörüne yazabilir; herkes public bucket’tan okuyabilir.

```sql
-- product-images: authenticated sellers can upload under their store folder
CREATE POLICY "product_images_insert_own_store"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.owner_id = auth.uid()
      AND (storage.foldername(name))[1] = s.id::text
  )
);

CREATE POLICY "product_images_update_own_store"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.owner_id = auth.uid()
      AND (storage.foldername(name))[1] = s.id::text
  )
);

CREATE POLICY "product_images_delete_own_store"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.owner_id = auth.uid()
      AND (storage.foldername(name))[1] = s.id::text
  )
);

-- Public read (bucket is public; policy still required in many projects)
CREATE POLICY "product_images_select_public"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');
```

> Not: Bucket’ı Dashboard’dan public oluşturduysan SELECT policy yine de eklenebilir. Policy çakışması olursa mevcut policy’leri Storage → Policies ekranından kontrol et.

## 3. Uygulama akışı

1. Satıcı ürünü kaydeder (ürün `id` oluşur).
2. Galeriden görsel seçilir (`expo-image-picker`).
3. `uploadProductImage(storeId, productId, uri)` Storage’a yükler.
4. Dönen public URL `products.image_url` alanına yazılır.

`store-logos` ve `avatars` bucket’ları sonraki iş paketlerinde eklenebilir; bu kısım yalnızca ürün görseline odaklanır.
