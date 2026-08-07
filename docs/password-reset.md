# Şifre sıfırlama (Supabase Auth)

Uygulama akışı:

1. Giriş → **Şifremi unuttum** → e-posta
2. `resetPasswordForEmail` + deep link `baret://reset-password` (Expo Go’da `exp://…/--/reset-password`)
3. Kullanıcı maildeki bağlantıya basar → uygulama açılır → **Yeni şifre** ekranı
4. `updateUser({ password })` sonrası normal oturum devam eder

## Supabase Dashboard ayarı (zorunlu)

**Authentication → URL Configuration → Redirect URLs** listesine ekle:

- `baret://reset-password`
- Geliştirme (Expo Go) için o anki `Linking.createURL('reset-password')` çıktısı, örn. `exp://127.0.0.1:8081/--/reset-password`

Site URL’yi bozmadan sadece redirect allow-list’e eklemek yeterli.

## Test

1. Kayıtlı bir e-posta ile sıfırlama iste
2. Maildeki linki telefonda / emülatörde aç (uygulama yüklü olmalı)
3. Yeni şifreyi kaydet → ilgili role paneline düşmeli

## Notlar

- Eski şifre okunamaz; yalnızca yeni şifre set edilir.
- Recovery oturumu `isPasswordRecovery` ile ana uygulamaya düşmeden önce şifre ekranına yönlendirilir.
