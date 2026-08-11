# iOS / App Store yayın rehberi (Baret)

Hedef: **TestFlight → App Store**. Kod Expo SDK 57 ile çapraz platform; asıl iş Apple hesabı, sertifika ve mağaza listesi.

Bundle ID: `com.baret.app`  
Sürüm: `1.0.0` · `ios.buildNumber` EAS `autoIncrement` ile artar (production).

## Önkoşullar (Truncgil / sen)

1. **Apple Developer Program** (yıllık ücretli) — mümkünse şirket (Truncgil) hesabı.
2. [App Store Connect](https://appstoreconnect.apple.com/) → **My Apps** → **+** → iOS app  
   - Name: Baret  
   - Bundle ID: `com.baret.app` (Developer portal’da Identifier oluştur)
3. Expo hesabında `eas login` + bu proje (`eas build:configure` zaten yapılmış).

`eas.json` → `submit.production.ios` alanlarını doldur:

| Alan | Nereden |
|------|---------|
| `ascAppId` | App Store Connect → App Information → **Apple ID** (sayı) |
| `appleTeamId` | [developer.apple.com/account](https://developer.apple.com/account) → Membership → Team ID |

## Build (Windows’dan EAS cloud)

```powershell
cd C:\Users\user\baret

# 1) İç test / cihaz (Ad Hoc veya development — ilk seferde Apple login ister)
npx eas-cli build -p ios --profile preview

# 2) Mağaza / TestFlight production IPA
npx eas-cli build -p ios --profile production
```

veya npm script:

```powershell
npm run build:ios:preview
npm run build:ios:store
```

İlk production build’de EAS, Apple’da dağıtım sertifikası + provisioning profili oluşturur (Apple ID ile giriş).

## TestFlight’a yükleme

```powershell
npx eas-cli submit -p ios --profile production --latest
```

veya:

```powershell
npm run submit:ios
```

İşlendikten sonra (~10–15 dk) [TestFlight](https://appstoreconnect.apple.com/) iç test grubuna ekle.

## App Store Connect checklist

- [ ] Gizlilik politikası URL: landing `privacy.html` (domain sonrası `https://baret.truncgil.com/privacy.html`)
- [ ] Hesap silme URL: `account-deletion.html`
- [ ] Destek URL: `https://www.truncgil.com` veya landing
- [ ] Kategori: Business / Shopping (uygun olanı seç)
- [ ] Yaş derecesi anketi
- [ ] **Privacy Nutrition Labels** (App Privacy): hesap, konum (yaklaşık), fotoğraflar (satıcı ürün), bildirimler
- [ ] iPhone 6.7" / 6.5" ekran görüntüleri (zorunlu)
- [ ] Açıklama (TR): onaylı nalbur, sepet, sipariş, teslim kodu, satıcı paneli
- [ ] Export compliance: uygulamada özel şifreleme yok → `usesNonExemptEncryption: false` (app.json)

## Deep link (şifre sıfırlama)

Supabase Redirect URLs:

- `baret://reset-password` (Android ile aynı scheme)

## Push (sonraki sprint)

Şu an tray bildirimleri uygulama açıkken (Realtime). Kapalı uygulama push için:

1. Apple Push Notifications capability (EAS sync)
2. APNs key → Expo / FCM köprüsü
3. Cihaz token kaydı

## Bilinen sınırlar

- Expo Go’da remote push SDK 53+ ile yok; iOS gerçek test **preview/production IPA** veya development build ile.
- Tablet destekli (`supportsTablet: true`); layout smoke test önerilir.
- Android Play production ayrı track; iOS ilk sürüm 1.0.0 olabilir.

## Sıra önerisi

1. Apple Developer + App Store Connect app kaydı  
2. `eas.json` Team ID + ascAppId  
3. `eas build -p ios --profile production`  
4. `eas submit` → TestFlight  
5. iPhone smoke test (auth, katalog, sepet, sipariş, satıcı ürün görseli, Credits)  
6. Listing + Review Submit  
