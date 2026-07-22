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

## 3. RLS — tablo bazlı özet (detaylar sonraki bölümlere)

Tüm tablolarda RLS **açıktır**. Politika yoksa erişim reddedilir.

| Tablo | Ana fikir |
|-------|-----------|
| `users` | Herkes yalnızca kendi profilini; admin geniş yetki |
| `stores` | Halka açık yalnızca onaylı+aktif; satıcı kendi mağazasını yönetir |
| `products` | Halka açık yalnızca aktif ürün (onaylı mağazada); satıcı CRUD |
| `orders` | Alıcı kendi siparişi; satıcı kendi mağaza siparişi; stok/rol kontrolleri |
| `reviews` | Herkes okur; yalnızca teslim edilmiş siparişe yorum |

Policy isimleri ve `USING` / `WITH CHECK` ifadelerinin satır satır açıklaması bu dokümana öğleden sonra ve akşam eklenecektir.
