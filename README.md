# 🪖 Baret

Baret, inşaat mühendisleri ile nalburları tek bir mobil platformda buluşturan çok satıcılı (multi-vendor) bir mobil pazaryeri uygulamasıdır.

Bu proje, Trunçgil Teknoloji Yaz Staj Programı kapsamında geliştirilmektedir.

---

# Projenin Amacı

İnşaat sektöründe malzeme tedarik sürecini dijitalleştirerek;

- ürün aramayı kolaylaştırmak,
- fiyat karşılaştırmasını mümkün kılmak,
- yerel nalburların dijitalleşmesini sağlamak,
- mühendislerin ihtiyaç duydukları ürünlere daha hızlı ulaşmasını hedeflemektedir.

---

# Kullanılacak Teknolojiler

- React Native (Expo)
- TypeScript
- Supabase
- PostgreSQL
- React Navigation
- NativeWind
- Context API

---

# Proje Yapısı

Bu repo geliştirme sürecinde aşağıdaki prensiplere göre yönetilmektedir.

- GitHub Issues
- GitHub Milestones
- GitHub Projects (Kanban)
- Feature Branch Workflow
- Pull Request Review
- Günlük Commit Takibi

---

# Dokümantasyon

Projenin ayrıntılı geliştirme planı aşağıdaki dosyada bulunmaktadır.

- implementation_plan.md

---

# UI Mockups (Alıcı Akışı)

Faz 1 kapsamında alıcı tarafının temel ekranları AI destekli olarak tasarlandı. Görseller `assets/mockups/` klasöründe saklanmaktadır.

## Tasarım Dili

| Öğe | Değer |
|-----|-------|
| Birincil renk | Safety Orange `#FF6B00` |
| Arka plan | Beyaz / açık gri |
| Kart stili | Yuvarlak köşeler, hafif gölge |
| Tipografi | Modern sans-serif |
| Navigasyon | Alt tab bar (Ana Sayfa, Kategoriler, Sepet, Profil) |

## Ana Sayfa

Arama çubuğu, kategori chip'leri, yakındaki nalburlar ve popüler ürünler grid'i.

![Ana Sayfa Mockup](assets/mockups/home-screen-mockup.png)

## Ürün Detay

Ürün galerisi, fiyat, mağaza bilgisi, stok durumu, teslimat seçenekleri ve sepete ekleme butonu.

![Ürün Detay Mockup](assets/mockups/product-detail-mockup.png)

## Sepet

Sepet kalemleri, adet seçici, indirim kodu alanı, sipariş özeti ve siparişi tamamla butonu.

![Sepet Mockup](assets/mockups/cart-screen-mockup.png)

---

# Faz 1 Teslim Edilenler

Faz 1 (Proje Hazırlığı, Analiz ve Tasarım) kapsamında aşağıdaki çıktılar tamamlandı:

| Çıktı | Dosya / Konum | Açıklama |
|-------|---------------|----------|
| Geliştirme planı | `implementation_plan.md` | 4 fazlı 20 günlük yol haritası, teknik mimari, ekran envanteri |
| Veritabanı şeması | `database.sql` | 5 tablo, ENUM tipleri, FK ilişkileri, RLS politikaları, trigger'lar |
| UI mockup'ları | `assets/mockups/` | Ana Sayfa, Ürün Detay, Sepet ekranları |
| Proje vitrini | `README.md` | Mockup sergileme, tech stack, proje durumu |

---

# Durum

✅ **Faz 1 tamamlandı (6/6 gün)** | Analiz, tasarım ve dokümantasyon aşaması bitti. **Sonraki: Faz 2 — Gün 7 (Pazartesi)** Expo + Supabase altyapı kurulumu.