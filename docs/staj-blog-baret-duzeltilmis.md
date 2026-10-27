# Baret: 20 günde inşaat–nalbur pazaryeri MVP’si

Staja, şantiye malzemesi alanlarla onaylı nalburları buluşturan bir mobil pazaryeri yol haritasıyla başladık. Yaklaşık 20 günlük yoğun geliştirme sonucunda **Baret** adlı bir MVP ortaya çıktı. Bu yazıda ne yaptığımızı, teknik tarafta neler öğrendiğimi ve gerçek kullanıcıyla testte nerede zorlandığımı özetliyorum.

## Ne yaptık?

Baret üç rol üzerine kurulu:

**Alıcı** katalogda ürün arar, sepete ekler ve sipariş oluşturur.  
**Satıcı** stok, lisans ve sipariş durumlarını yönetir.  
**Admin** mağaza onayları, lisans anahtarları, komisyon/plan tarafı ve şikayet takibini yürütür.

Teknik yığın kısaca şöyle: sunucu tarafında **Supabase** (Auth, PostgreSQL, RLS, Storage, RPC); istemci tarafında **Expo SDK 57**, **TypeScript** ve **React Navigation**.

## Teknik tarafta öğrendiklerim

Güvenlik ve iş kurallarını veritabanına yakın tutmak kritik oldu. **RLS** ve güvenli **RPC** ile örneğin mağaza telefonunun sipariş kabulünden önce gizlenmesi gibi kuralları uyguladık. Sipariş akışı net bir durum makinesi: *Beklemede → Hazırlanıyor → Yolda/Hazır → Teslim edildi*. Gel-al siparişlerde **6 haneli teslim kodu** ile satıcı doğrulama yapıp siparişi kapatıyor.

Monetizasyon tarafında ilk dönemde tutar dilimli komisyon ve taban ücret denedik; admin panelden yönetilebilir hale getirdik. Sonraki iterasyonda model **satıcı abonelik planlarına** (ürün kapasitesi) evrildi — platform gelirini sipariş kesintisinden ziyade plan kotasına bağlamak için.

Dağıtımda yalnızca Expo Go ile yetinmedik; **EAS Build** ile telefona kurulabilir APK/AAB ürettik, ortam değişkenleri ve keystore süreçlerini de bu hatta öğrendik.

## En çok zorlandığım yer: gerçek kullanıcı

Checkout ekranını babamla test ederken iki somut sorun çıktı. Klavye açılınca “Siparişi oluştur” butonu kayboluyordu; adresi “opsiyonel” bırakmak da teslimatın nereye gideceği konusunda kafa karıştırıyordu. Formu sadeleştirip adresi zorunlu yaptık, gönder butonunu klavyenin üstünde görünür tutacak şekilde düzelttik.

Buradan çıkan ders net: **Kodun çalışması ile insanın kullanabilmesi aynı şey değil.**

## Bugün nerede duruyoruz?

Baret Google Play’de yayına hazırlanmış / inceleme–yayın hattındadır. Tanıtım sitesi Vercel üzerinde; Truncgil tarafında `baret.truncgil.com` domain bağlantısı planlanıyor. Son dönemde gizlilik sayfaları, yerel bildirim köprüsü, şifre sıfırlama, uygulama içi Credits/iletişim ve landing SEO (yapısal veri, llms.txt) gibi mağaza ve sunum katmanlarını da tamamladık.

Kısaca: Baret, staj süresinde uçtan uca çalışan bir pazaryeri iskeleti olmanın ötesine geçip gerçek cihaz, gerçek kullanıcı ve mağaza süreçleriyle yüzleştiği bir MVP’ye dönüştü.

---

**Önerilen öne çıkan görsel metni (Gemini’ye yapıştır):**  
“Modern mobile marketplace app for construction supplies, orange hard-hat brand color, clean UI mockup of catalog and order screens, professional Turkish tech internship portfolio style, no text clutter, high quality”
