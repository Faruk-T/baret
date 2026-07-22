# RLS ve Trigger Referansı

Bu doküman `database.sql` içindeki güvenlik katmanını (trigger’lar, yardımcı fonksiyonlar, RLS politikaları) açıklar. Gün 9 çalışmasının referansıdır.

---

## 1. Trigger’lar

### 1.1 `set_updated_at` — otomatik zaman damgası

| Özellik | Değer |
|---------|--------|
| Fonksiyon | `public.set_updated_at()` |
| Tip | `BEFORE UPDATE` row trigger |
| Tablolar | `users`, `stores`, `products`, `orders`, `reviews` |
| Trigger adları | `trg_users_updated_at`, `trg_stores_updated_at`, `trg_products_updated_at`, `trg_orders_updated_at`, `trg_reviews_updated_at` |

**Ne yapar:** Satır güncellendiğinde `updated_at` alanını `NOW()` ile yazar. Uygulama tarafında timestamp elle set etmeye gerek kalmaz.

### 1.2 `handle_new_user` — Auth → public.users köprüsü

| Özellik | Değer |
|---------|--------|
| Fonksiyon | `public.handle_new_user()` |
| Tip | `AFTER INSERT` on `auth.users` |
| Trigger adı | `on_auth_user_created` |
| Güvenlik | `SECURITY DEFINER` |

**Ne yapar:** Supabase Auth’ta yeni kullanıcı oluşunca `public.users` satırı otomatik eklenir.

**Rol kuralları:**
- `raw_user_meta_data.role` yalnızca `buyer` veya `seller` olabilir
- Başka bir değer veya boş ise varsayılan `buyer`
- `admin` kayıt sırasında atanamaz (admin self-assign engeli)

**Kopyalanan alanlar:** `id`, `email`, `full_name`, `phone`, `role`

---

## 2. Yardımcı fonksiyonlar (RLS için)

### 2.1 `is_admin()`

```text
RETURNS BOOLEAN
```

Oturum açmış kullanıcının (`auth.uid()`) `public.users` satırında `role = 'admin'` olup olmadığını kontrol eder. Admin politikalarında tekrar kullanılır.

### 2.2 `is_store_owner(p_store_id UUID)`

```text
RETURNS BOOLEAN
```

Verilen mağazanın `owner_id` alanının mevcut kullanıcıya ait olup olmadığını kontrol eder. Ürün ve sipariş politikalarında “bu mağaza benim mi?” sorusuna cevap verir.

---

## 3. RLS politikaları — `users`, `stores`, `products`

Tüm tablolarda RLS **açıktır**. Politika yoksa erişim reddedilir.

### 3.1 `users`

| Policy | Komut | Kim | Kural |
|--------|-------|-----|-------|
| `users_select_own_or_admin` | SELECT | authenticated | Kendi satırı (`id = auth.uid()`) veya `is_admin()` |
| `users_update_own` | UPDATE | authenticated | Kendi satırını günceller; **rolünü değiştiremez** (mevcut role sabit) |
| `users_admin_update` | UPDATE | authenticated | Admin herhangi bir kullanıcı satırını güncelleyebilir |

**Notlar:**
- Anonim kullanıcı profil okuyamaz/yazamaz
- Rol yükseltme (ör. buyer → admin) self-service ile mümkün değil; admin kanalı gerekir

### 3.2 `stores`

| Policy | Komut | Kim | Kural |
|--------|-------|-----|-------|
| `stores_select_public_approved` | SELECT | anon + authenticated | Yalnızca `is_approved = true` ve `is_active = true` |
| `stores_select_own` | SELECT | authenticated | Kendi mağazası (`owner_id = auth.uid()`) veya admin — onay bekleyen mağaza da görünür |
| `stores_insert_seller` | INSERT | authenticated | `owner_id` kendisi olmalı ve `users.role = 'seller'` |
| `stores_update_own_or_admin` | UPDATE | authenticated | Sahibi veya admin |
| `stores_delete_own_or_admin` | DELETE | authenticated | Sahibi veya admin |

**Notlar:**
- Onaysız mağaza halka açık listede görünmez (cold-start / admin onayı)
- Alıcı (`buyer`) mağaza oluşturamaz

### 3.3 `products`

| Policy | Komut | Kim | Kural |
|--------|-------|-----|-------|
| `products_select_public_active` | SELECT | anon + authenticated | `is_active = true` ve bağlı mağaza onaylı+aktif |
| `products_select_own_store` | SELECT | authenticated | `is_store_owner(store_id)` veya admin — pasif ürünler de görünür |
| `products_insert_store_owner` | INSERT | authenticated | Mağaza sahibi veya admin |
| `products_update_store_owner` | UPDATE | authenticated | Mağaza sahibi veya admin |
| `products_delete_store_owner` | DELETE | authenticated | Mağaza sahibi veya admin |

**Notlar:**
- Halka açık katalog yalnızca aktif ürünleri gösterir
- Satıcı kendi mağazasındaki ürünleri tam CRUD yapar; başka mağazaya ürün ekleyemez

---

## 4. RLS politikaları — `orders`, `reviews` (sonraki kısım)

Sipariş ve değerlendirme politikaları (stok kontrolü, iptal kuralı, `delivered` zorunluluğu) bir sonraki commit’te bu dokümana eklenecektir.

