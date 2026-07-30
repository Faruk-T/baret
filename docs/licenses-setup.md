# Satıcı lisans anahtarları

Admin tek kullanımlık kod üretir; satıcı Mağaza ayarlarında aktive eder. Süre `stores.license_expires_at` alanına yazılır (mevcut süre varsa uzatılır).

## Kurulum (mevcut Supabase projesi)

1. Dashboard → **SQL Editor**
2. `docs/licenses-setup.sql` içeriğini çalıştır
3. Uygulamayı yenile

Yeni kurulumlarda `database.sql` zaten bu tabloları içerir.

## Akış

1. **Admin** → Lisans anahtarları → süre seç (30 / 90 / 365) → Anahtar üret → Paylaş
2. **Satıcı** → Mağaza → kodu yapıştır → Lisansı aktive et
3. Dashboard’da süre dolunca / yaklaşıyorsa uyarı banner’ı çıkar
4. Geçerli lisans yokken **yeni ürün ekleme** engellenir (mevcut ürün düzenleme serbest)
