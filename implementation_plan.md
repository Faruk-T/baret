# Baret — İnşaat ve Nalbur Pazaryeri
## Kapsamlı Proje Dokümantasyonu & 20 Günlük Implementation Plan

> **Son güncelleme:** 30 Temmuz 2026 (Perşembe)  
> **Proje durumu:** Gün 18–19 ✅ (polish + admin özet) | Sonraki: Gün 20 demo  
> **Repo:** [github.com/Faruk-T/baret](https://github.com/Faruk-T/baret)

Bu doküman, Baret projesini hiç bilmeyen bir geliştiricinin bile uçtan uca anlayabilmesi için hazırlanmış **tek kaynak (single source of truth)** dokümantasyondur. İş modeli, teknik mimari, veritabanı şeması, ekran envanteri, kullanıcı akışları, güvenlik kuralları ve gün gün geliştirme planı burada yer alır.

---

## İçindekiler

0. [4 Faz Özeti](#0-4-faz-özeti)
1. [Proje Özeti ve Vizyon](#1-proje-özeti-ve-vizyon)
2. [İş Modeli ve Gelir Yapısı](#2-iş-modeli-ve-gelir-yapısı)
3. [Kullanıcı Rolleri ve Yetkiler](#3-kullanıcı-rolleri-ve-yetkiler)
4. [Teknoloji Yığını (Tech Stack)](#4-teknoloji-yığını-tech-stack)
5. [Sistem Mimarisi](#5-sistem-mimarisi)
6. [Klasör Yapısı](#6-klasör-yapısı)
7. [Veritabanı Mimarisi](#7-veritabanı-mimarisi)
8. [Güvenlik: RLS Politikaları](#8-güvenlik-rls-politikaları)
9. [Supabase Storage Planı](#9-supabase-storage-planı)
10. [State Management (Context API)](#10-state-management-context-api)
11. [Navigasyon Mimarisi](#11-navigasyon-mimarisi)
12. [Ekran Envanteri](#12-ekran-envanteri)
13. [Kullanıcı Akışları](#13-kullanıcı-akışları)
14. [Servis Katmanı (API Fonksiyonları)](#14-servis-katmanı-api-fonksiyonları)
15. [Sipariş Yaşam Döngüsü](#15-sipariş-yaşam-döngüsü)
16. [Gelecek Modüller (RFQ & Komisyon)](#16-gelecek-modüller-rfq--komisyon)
17. [Ortam Değişkenleri ve Kurulum](#17-ortam-değişkenleri-ve-kurulum)
18. [Git İş Akışı ve Şirket Prosedürleri (Trunçgil Standartları)](#18-git-iş-akışı-ve-şirket-prosedürleri-trunçgil-standartları)
19. [Test Stratejisi](#19-test-stratejisi)
20. [20 Günlük Geliştirme Planı (4 Faz)](#20-20-günlük-geliştirme-planı-4-faz)
21. [Riskler ve Bağımlılıklar](#21-riskler-ve-bağımlılıklar)
22. [Teslim Kriterleri (Definition of Done)](#22-teslim-kriterleri-definition-of-done)

---

## 0. 4 Faz Özeti

Proje, **Trunçgil Teknoloji** staj prosedürüne uygun olarak **4 faza** ve toplam **20 iş gününe** bölünmüştür. Faz 1, proje hazırlığının kritikliği nedeniyle **6 gün/madde**den oluşur; kalan 14 gün diğer 3 faza dağıtılmıştır. Her fazın amacı, teslim edilecekler ve gün aralığı aşağıdadır.

| Faz | Ad | Gün Sayısı | Günler | Odak | Teslim Edilecekler |
|-----|-----|-----------|--------|------|-------------------|
| **Faz 1** | Proje Hazırlığı, Analiz ve Tasarım | 6 gün | Gün 1–6 | Dokümantasyon, ER diyagramı, UI mockup | `implementation_plan.md`, `database.sql` tasarımı, mockup görselleri |
| **Faz 2** | Altyapı Kurulumu ve Veritabanı | 5 gün | Gün 7–11 | Expo, Supabase, Auth, Navigation | Çalışan proje iskeleti, RLS, Login/Register ekranları |
| **Faz 3** | Satıcı ve Müşteri Ekosistemi | 5 gün | Gün 12–16 | CRUD, Storage, Sepet, Checkout | Nalbur paneli, ürün yönetimi, alıcı sipariş akışı |
| **Faz 4** | Yönetim, Optimizasyon ve Kapanış | 4 gün | Gün 17–20 | Review, Admin, test, demo | Değerlendirme sistemi, admin onayı, canlı demo |

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FAZ 1 (Gün 1-6)     Analiz & Tasarım        ██████████ 100%             │
│  FAZ 2 (Gün 7-11)    Altyapı & Veritabanı    ██████████ 100%             │
│  FAZ 3 (Gün 12-16)   Satıcı & Alıcı          ██████████ 100%             │
│  FAZ 4 (Gün 17-20)   Admin & Kapanış         ████████░░  80%             │
└─────────────────────────────────────────────────────────────────────────┘
   ↑ Sonraki: Gün 20 (demo / son PR merge)
```

> **KESİN KURAL — Gün Koordinasyonu:** Her fazda **aynı anda en fazla bir gün** ✅/🔄 olarak işaretlenebilir. Bir gün tamamlanmadan (✅ olmadan):
> 1. Aynı fazın bir sonraki günü **başlatılmış (🔄)** olarak işaretlenemez.
> 2. Bir sonraki fazın **hiçbir günü** ✅ veya 🔄 olamaz — Faz 1 bitmeden Faz 2'nin 1. günü bile işaretlenemez.
> 3. Takip üç durumla yapılır: `✅ Tamamlandı`, `🔄 Devam Ediyor (Bugün)`, `⬜ Bekliyor`. Aynı anda yalnızca **bir** görev 🔄 olabilir.
>
> Bu kural, Faz 1 ile Faz 2'nin farklı haftalara denk gelmesinden kaynaklanan karışıklığı (örn. 1. gün bitmeden 6. günün işaretlenmesi) önlemek için zorunludur.

---

## 1. Proje Özeti ve Vizyon

### Problem
İnşaat mühendisleri ve şantiye ekipleri, ihtiyaç duydukları hırdavat ve yapı malzemelerini genellikle farklı nalburlardan ayrı ayrı temin eder. Fiyat karşılaştırması zor, stok bilgisi güncel değil, teslimat seçenekleri belirsizdir.

### Çözüm
**Baret**, inşaat mühendislerini (alıcılar) ve nalburları (satıcılar) tek bir mobil platformda buluşturan **çok satıcılı (multi-vendor)** bir pazar yeridir. Mühendisler konumlarına en yakın nalburu bulabilir, ürünleri karşılaştırabilir, sepete ekleyip sipariş verebilir ve teslimat sonrası nalburu puanlayabilir.

### Temel Değer Önerileri

| Paydaş | Değer |
|--------|-------|
| **Mühendis (Alıcı)** | Konum bazlı arama, fiyat karşılaştırma, stok görünürlüğü, teslimat seçenekleri |
| **Nalbur (Satıcı)** | Dijital vitrin, ürün/stok yönetimi, sipariş takibi, müşteri değerlendirmeleri |
| **Admin** | Satıcı onayı, platform denetimi, komisyon yönetimi |
| **Platform (Baret)** | Her başarılı siparişten komisyon geliri |

### Proje Kapsamı (MVP — Minimum Viable Product)

MVP kapsamında şunlar **vardır:**
- Rol bazlı kayıt/giriş (Alıcı, Satıcı, Admin)
- Mağaza oluşturma ve admin onayı
- Ürün CRUD + görsel yükleme
- Ürün listeleme, arama, filtreleme
- Sepet ve sipariş oluşturma
- Sipariş durumu takibi
- Teslimat sonrası 1–5 yıldız değerlendirme

MVP kapsamında şunlar **sonraki fazdadır:**
- RFQ (Request for Quote — toptan teklif talebi)
- Komisyon hesaplama ve raporlama
- Push bildirimleri
- Ödeme entegrasyonu (iyzico / Stripe)
- Çoklu ürünlü sipariş (order_items tablosu)

---

## 2. İş Modeli ve Gelir Yapısı

```
Mühendis sipariş verir
        ↓
Nalbur siparişi hazırlar ve teslim eder
        ↓
Platform, sipariş tutarı üzerinden %X komisyon alır
        ↓
Kalan tutar nalbura ödenir (manuel / gelecek fazda otomatik)
```

| Kavram | Açıklama |
|--------|----------|
| **Komisyon oranı** | Admin tarafından belirlenir (ör. %8). MVP'de veritabanına eklenmez; Faz 5'te `platform_settings` tablosu ile yönetilir. |
| **Onay mekanizması** | Yeni nalbur mağazaları `is_approved = false` ile başlar; admin onaylayana kadar ürünleri halka açık görünmez. |
| **Çok satıcılı yapı** | Her nalbur kendi mağazasını ve ürünlerini bağımsız yönetir. Mühendis tek seferde yalnızca bir nalburdan sipariş verir (MVP). |

---

## 3. Kullanıcı Rolleri ve Yetkiler

### 3.1 Mühendis / Alıcı (`buyer`)

| Yetki | Açıklama |
|-------|----------|
| Kayıt / Giriş | `role: buyer` ile kayıt olur |
| Ürün görüntüleme | Onaylı mağazaların aktif ürünlerini görür |
| Arama & filtreleme | Şehir, ilçe, fiyat, teslimat tipine göre filtreler |
| Sepet yönetimi | Ürün ekler, miktar değiştirir, kaldırır |
| Sipariş verme | Stok kontrolü yapılarak sipariş oluşturur |
| Sipariş iptali | Yalnızca `pending` durumundaki siparişi iptal edebilir |
| Değerlendirme | `delivered` siparişler için 1–5 yıldız + yorum bırakır |

### 3.2 Nalbur / Satıcı (`seller`)

| Yetki | Açıklama |
|-------|----------|
| Kayıt / Giriş | `role: seller` ile kayıt olur |
| Mağaza oluşturma | Kendi mağazasını oluşturur (admin onayı bekler) |
| Ürün yönetimi | Kendi mağazasına ürün ekler, düzenler, siler |
| Görsel yükleme | Ürün fotoğraflarını Supabase Storage'a yükler |
| Sipariş yönetimi | Gelen siparişleri görür, durumu günceller |
| Stok yönetimi | Ürün stok miktarını günceller |

### 3.3 Admin (`admin`)

| Yetki | Açıklama |
|-------|----------|
| Satıcı onayı | `stores.is_approved` alanını `true` yapar |
| Tüm verilere erişim | RLS bypass ile tüm tabloları okur/günceller |
| Rol yönetimi | Kullanıcı rollerini değiştirir |
| Platform denetimi | Uygunsuz içerikleri kaldırır |

> **Önemli:** Admin rolü kayıt sırasında seçilemez. İlk admin, Supabase Dashboard'dan manuel oluşturulur ve SQL ile `role = 'admin'` atanır.

---

## 4. Teknoloji Yığını (Tech Stack)

| Katman | Teknoloji | Sürüm | Görev |
|--------|-----------|-------|-------|
| **Mobil Framework** | React Native (Expo) | SDK 57 | Cross-platform mobil uygulama |
| **Dil** | TypeScript | 6.x | Tip güvenliği |
| **Stil** | NativeWind (TailwindCSS) | 4.x | Utility-first CSS |
| **Navigasyon** | React Navigation | 7.x | Stack & Tab navigasyon |
| **Backend** | Supabase | — | PostgreSQL, Auth, Storage, RLS |
| **State** | React Context API | — | Auth, Sepet global state |
| **Oturum** | AsyncStorage + SecureStore | — | Token saklama |
| **Tasarım** | Figma / AI Mockup | — | UI/UX prototipleme |

### Kurulu Bağımlılıklar (`package.json`)

```
@supabase/supabase-js
@react-navigation/native, native-stack, bottom-tabs
@react-native-async-storage/async-storage
react-native-screens, safe-area-context, gesture-handler
react-native-url-polyfill
expo-secure-store
nativewind, tailwindcss
```

---

## 5. Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────┐
│                    MOBİL UYGULAMA (Expo)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Screens  │  │Components│  │Navigation│  │ Context │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       └─────────────┴─────────────┴──────────────┘     │
│                          │                              │
│                   ┌──────▼──────┐                       │
│                   │  Services   │  (supabase.ts)        │
│                   └──────┬──────┘                       │
└──────────────────────────┼──────────────────────────────┘
                           │ HTTPS (REST + Realtime)
┌──────────────────────────▼──────────────────────────────┐
│                      SUPABASE                            │
│  ┌─────────┐  ┌────────────┐  ┌─────────┐  ┌─────────┐ │
│  │  Auth   │  │ PostgreSQL │  │ Storage │  │   RLS   │ │
│  └─────────┘  └────────────┘  └─────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Katman Sorumlulukları

| Katman | Ne yapar | Ne yapmaz |
|--------|----------|-----------|
| **Screens** | UI render, kullanıcı etkileşimi, servis çağrısı orkestrasyonu | Doğrudan Supabase client kullanmaz |
| **Components** | Yeniden kullanılabilir UI parçaları | İş mantığı barındırmaz |
| **Services** | Tüm Supabase CRUD işlemleri | UI state yönetmez |
| **Context** | Global state (oturum, sepet) | API çağrısı yapmaz (service'i çağırır) |
| **Navigation** | Rol bazlı ekran yönlendirme | Veri işlemez |
| **Types** | TypeScript interface ve enum tanımları | — |

---

## 6. Klasör Yapısı (Project Structure)

Projemiz aşağıdaki modüler yapıya sadık kalınarak inşa edilecektir. Tüm kaynak kod `src/` altında toplanır; kök dizinde yalnızca yapılandırma ve giriş dosyaları bulunur.

### Project Structure — Basit Klasör Ağacı

```text
baret/
├── assets/                  # İkonlar, mockup görselleri, logolar ve fontlar
├── src/
│   ├── components/          # Ortak UI bileşenleri (Button, Input, ProductCard)
│   ├── screens/             # Ekranlar (Home, Cart, SellerDashboard, Login)
│   ├── navigation/          # Sayfa yönlendirmeleri (Stack & Tab Navigators)
│   ├── services/            # Supabase API istekleri ve veritabanı fonksiyonları
│   ├── context/             # Global state (AuthContext, CartContext)
│   ├── hooks/               # Özel React hook'ları
│   ├── types/               # TypeScript tipleri ve Enum tanımlamaları
│   ├── constants/           # Renkler, config, route isimleri
│   └── utils/               # Formatlama ve doğrulama yardımcıları
├── App.tsx                  # Uygulama giriş noktası
├── database.sql             # Supabase şeması ve RLS politikaları
├── implementation_plan.md   # 20 günlük yol haritası (bu dosya)
└── README.md                # Hızlı başlangıç kılavuzu
```

### Project Structure — Detaylı Klasör Ağacı

```text
baret/
├── assets/
│   ├── icon.png
│   ├── splash-icon.png
│   ├── favicon.png
│   └── mockups/                     # Figma / AI tasarım taslakları
│
├── src/
│   ├── components/
│   │   ├── common/                  # Button, Input, Card, Loading, EmptyState
│   │   ├── buyer/                   # ProductCard, SearchBar, CartItem
│   │   └── seller/                  # StoreForm, ProductForm, OrderCard
│   │
│   ├── screens/
│   │   ├── auth/                    # LoginScreen, RegisterScreen, RoleSelectScreen
│   │   ├── buyer/                   # HomeScreen, ProductDetailScreen, CartScreen
│   │   ├── seller/                  # DashboardScreen, ProductListScreen, StoreSetupScreen
│   │   └── admin/                   # SellerApprovalScreen, AdminDashboardScreen
│   │
│   ├── navigation/
│   │   ├── AppNavigator.tsx         # Kök: Auth mu, App mi?
│   │   ├── AuthNavigator.tsx        # Login → Register stack
│   │   ├── BuyerNavigator.tsx       # Alıcı bottom tabs
│   │   ├── SellerNavigator.tsx      # Satıcı bottom tabs
│   │   └── AdminNavigator.tsx       # Admin stack
│   │
│   ├── services/
│   │   ├── supabase.ts              # Tek Supabase client instance
│   │   ├── auth.service.ts          # signUp, signIn, signOut, getSession
│   │   ├── store.service.ts         # Mağaza CRUD
│   │   ├── product.service.ts       # Ürün CRUD + listeleme
│   │   ├── order.service.ts         # Sipariş oluşturma, durum güncelleme
│   │   ├── review.service.ts        # Değerlendirme CRUD
│   │   └── storage.service.ts       # Görsel yükleme (Supabase Storage)
│   │
│   ├── context/
│   │   ├── AuthContext.tsx          # user, session, role, loading
│   │   └── CartContext.tsx          # items[], addItem, removeItem, clearCart
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCart.ts
│   │   └── useLocation.ts           # Konum bazlı arama (expo-location)
│   │
│   ├── types/
│   │   ├── database.types.ts        # Supabase tablo tipleri
│   │   ├── navigation.types.ts      # Stack/Tab param listeleri
│   │   └── enums.ts                 # UserRole, OrderStatus, DeliveryOption
│   │
│   ├── constants/
│   │   ├── colors.ts                # Marka renkleri
│   │   ├── config.ts                # Uygulama sabitleri
│   │   └── routes.ts                # Ekran isimleri (magic string önleme)
│   │
│   └── utils/
│       ├── formatters.ts            # formatPrice(1500) → "₺1.500,00"
│       └── validators.ts            # E-posta, telefon, zorunlu alan kontrolü
│
├── App.tsx
├── global.css                       # @tailwind base/components/utilities
├── tailwind.config.js
├── babel.config.js                  # nativewind/babel plugin
├── metro.config.js                  # withNativeWind wrapper
├── database.sql                     # Supabase şema + RLS (tek kaynak)
├── .env                             # Gerçek anahtarlar (GIT'E EKLENMEZ)
├── .env.example                     # Şablon
├── implementation_plan.md           # Bu dosya — 20 günlük yol haritası
└── README.md
```

### Klasör Sorumlulukları

| Klasör | Sorumluluk | Örnek Dosya |
|--------|------------|-------------|
| `src/components/` | Yeniden kullanılabilir UI parçaları | `ProductCard.tsx` |
| `src/screens/` | Tam ekran görünümler | `HomeScreen.tsx` |
| `src/navigation/` | Rol bazlı ekran yönlendirme | `BuyerNavigator.tsx` |
| `src/services/` | Supabase CRUD işlemleri | `product.service.ts` |
| `src/context/` | Global state (Context API) | `AuthContext.tsx` |
| `src/hooks/` | Context/servis sarmalayıcıları | `useAuth.ts` |
| `src/types/` | TypeScript tip güvenliği | `database.types.ts` |
| `src/constants/` | Sabit değerler | `colors.ts` |
| `src/utils/` | Saf yardımcı fonksiyonlar | `formatters.ts` |

---

## 7. Veritabanı Mimarisi

Tam SQL dosyası: [`database.sql`](./database.sql)

### 7.1 ER Diyagramı (Varlık-İlişki)

```mermaid
erDiagram
    AUTH_USERS ||--|| USERS : "1:1"
    USERS ||--o{ STORES : "sahip olur (seller)"
    STORES ||--o{ PRODUCTS : "içerir"
    USERS ||--o{ ORDERS : "alıcı olarak verir (buyer)"
    STORES ||--o{ ORDERS : "alıcı olarak alır"
    PRODUCTS ||--o{ ORDERS : "sipariş edilir"
    USERS ||--o{ REVIEWS : "yazar (buyer)"
    STORES ||--o{ REVIEWS : "değerlendirilir"
    ORDERS ||--o| REVIEWS : "teslim sonrası"

    USERS {
        uuid id PK
        text email
        text full_name
        text phone
        enum role "admin|buyer|seller"
        text avatar_url
        timestamptz created_at
        timestamptz updated_at
    }

    STORES {
        uuid id PK
        uuid owner_id FK
        text name
        text address
        text city
        text district
        float latitude
        float longitude
        text phone
        boolean is_approved
        boolean is_active
    }

    PRODUCTS {
        uuid id PK
        uuid store_id FK
        text name
        text image_url
        numeric price
        int stock
        enum_array delivery_options
        date expiry_date
        boolean is_active
    }

    ORDERS {
        uuid id PK
        uuid buyer_id FK
        uuid store_id FK
        uuid product_id FK
        int quantity
        numeric unit_price
        numeric total_amount
        enum status
        enum delivery_option
        text delivery_address
    }

    REVIEWS {
        uuid id PK
        uuid buyer_id FK
        uuid store_id FK
        uuid order_id FK
        int rating "1-5"
        text comment
    }
```

### 7.2 Tablo Detayları

#### `public.users`
Supabase `auth.users` tablosunun public uzantısıdır. Her kayıt olan kullanıcı için `handle_new_user()` trigger'ı otomatik satır oluşturur.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | UUID PK | `auth.users.id` ile birebir |
| `email` | TEXT | Kayıt e-postası |
| `full_name` | TEXT | Ad soyad |
| `phone` | TEXT | İletişim telefonu |
| `role` | `user_role` ENUM | `admin`, `buyer`, `seller` |
| `avatar_url` | TEXT | Profil fotoğrafı URL |

#### `public.stores`
Nalbur mağaza bilgileri. Bir satıcı birden fazla mağaza açabilir (MVP'de kısıt yok).

| Alan | Tip | Açıklama |
|------|-----|----------|
| `owner_id` | UUID FK → users | Mağaza sahibi (seller) |
| `name` | TEXT | Mağaza adı |
| `address` | TEXT | Tam adres |
| `city` / `district` | TEXT | Konum filtreleme için |
| `latitude` / `longitude` | FLOAT | Harita / mesafe hesabı |
| `is_approved` | BOOLEAN | Admin onay durumu (default: false) |
| `is_active` | BOOLEAN | Mağaza aktif mi |

#### `public.products`
Mağazaya bağlı ürünler.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `store_id` | UUID FK → stores | Hangi mağazaya ait |
| `price` | NUMERIC(12,2) | Birim fiyat (₺) |
| `stock` | INTEGER | Mevcut stok adedi |
| `delivery_options` | `delivery_option[]` | `kargo`, `gel_al`, `aracla_teslim` |
| `expiry_date` | DATE | Son kullanma tarihi (opsiyonel) |
| `is_active` | BOOLEAN | Satışa açık mı |

#### `public.orders`
Mühendisin nalburdan verdiği sipariş. MVP'de sipariş başına tek ürün.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `buyer_id` | UUID FK → users | Siparişi veren mühendis |
| `store_id` | UUID FK → stores | Siparişin gittiği nalbur |
| `product_id` | UUID FK → products | Sipariş edilen ürün |
| `quantity` | INTEGER | Adet |
| `unit_price` | NUMERIC | Sipariş anındaki birim fiyat (snapshot) |
| `total_amount` | NUMERIC | `unit_price × quantity` (CHECK constraint) |
| `status` | `order_status` ENUM | Sipariş durumu |
| `delivery_option` | `delivery_option` ENUM | Seçilen teslimat tipi |
| `delivery_address` | TEXT | Teslimat adresi |

#### `public.reviews`
Teslim edilen siparişler için değerlendirme.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `buyer_id` | UUID FK → users | Yorumu yazan mühendis |
| `store_id` | UUID FK → stores | Değerlendirilen nalbur |
| `order_id` | UUID FK → orders | İlgili sipariş (UNIQUE per buyer) |
| `rating` | INTEGER | 1–5 arası puan |
| `comment` | TEXT | Yorum metni |

### 7.3 Enum Tipleri

```sql
user_role:       'admin' | 'buyer' | 'seller'
order_status:    'pending' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
delivery_option: 'kargo' | 'gel_al' | 'aracla_teslim'
```

### 7.4 Trigger'lar

| Trigger | Tetikleyici | Görev |
|---------|-------------|-------|
| `on_auth_user_created` | `auth.users` INSERT | `public.users` satırı oluşturur |
| `trg_*_updated_at` | Her tablo UPDATE | `updated_at` alanını günceller |

### 7.5 Yardımcı Fonksiyonlar

| Fonksiyon | Dönüş | Kullanım |
|-----------|-------|----------|
| `is_admin()` | BOOLEAN | RLS: admin kontrolü |
| `is_store_owner(store_id)` | BOOLEAN | RLS: mağaza sahibi kontrolü |
| `set_updated_at()` | TRIGGER | Otomatik timestamp |

---

## 8. Güvenlik: RLS Politikaları

Tüm tablolarda Row Level Security (RLS) **aktiftir**. Hiçbir istemci, politikaları geçmeden veriye erişemez.

### Özet Matris

| Tablo | Anonim | Alıcı (buyer) | Satıcı (seller) | Admin |
|-------|--------|---------------|-----------------|-------|
| **users** | — | Kendi profilini okur/günceller | Kendi profilini okur/günceller | Tümünü okur/günceller |
| **stores** | Onaylı mağazaları görür | Onaylı mağazaları görür | Kendi mağazasını CRUD | Tümünü CRUD + onaylar |
| **products** | Aktif ürünleri görür | Aktif ürünleri görür | Kendi ürünlerini CRUD | Tümünü CRUD |
| **orders** | — | Kendi siparişlerini görür/oluşturur/iptal | Mağaza siparişlerini görür/günceller | Tümünü yönetir |
| **reviews** | Tümünü okur | Teslim edilmiş siparişe yorum yazar | — | Tümünü yönetir |

### Kritik İş Kuralları (RLS ile zorlanır)

1. **Admin self-assign yok:** Kayıt sırasında yalnızca `buyer` veya `seller` seçilebilir.
2. **Onaysız mağaza görünmez:** `is_approved = false` mağazalar halka açık SELECT'te görünmez.
3. **Stok kontrolü:** Sipariş oluşturulurken `stock >= quantity` zorunlu.
4. **İptal kuralı:** Alıcı yalnızca `pending` siparişi `cancelled` yapabilir.
5. **Değerlendirme kuralı:** Yalnızca `delivered` siparişler değerlendirilebilir; sipariş başına tek yorum.

---

## 9. Supabase Storage Planı

| Bucket | Erişim | İçerik | Yol yapısı |
|--------|--------|--------|------------|
| `product-images` | Public read, authenticated write | Ürün fotoğrafları | `{store_id}/{product_id}/{filename}` |
| `store-logos` | Public read, authenticated write | Mağaza logoları | `{store_id}/logo.{ext}` |
| `avatars` | Public read, authenticated write | Profil fotoğrafları | `{user_id}/avatar.{ext}` |

### Storage RLS

Politikalar ve bucket adımları: `docs/storage-setup.md` (Gün 13).

```sql
-- Satıcı yalnızca kendi mağaza klasörüne yükleyebilir
-- Public bucket: ürün görselleri herkese okunur
```

---

## 10. State Management (Context API)

### AuthContext

```typescript
interface AuthState {
  user: User | null;          // public.users satırı
  session: Session | null;    // Supabase session
  role: UserRole | null;      // 'admin' | 'buyer' | 'seller'
  isLoading: boolean;
  signIn: (email, password) => Promise<void>;
  signUp: (email, password, metadata) => Promise<void>;
  signOut: () => Promise<void>;
}
```

### CartContext

```typescript
interface CartItem {
  productId: string;
  storeId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  deliveryOptions: DeliveryOption[];
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;        // computed
  itemCount: number;          // computed
}
```

> **Not:** MVP'de sepet yalnızca tek nalbur ürünlerini destekler. Farklı nalbur ürünü eklenmeye çalışılırsa kullanıcıya uyarı gösterilir.

---

## 11. Navigasyon Mimarisi

```mermaid
flowchart TD
    A[AppNavigator] --> B{Oturum var mı?}
    B -->|Hayır| C[AuthNavigator]
    B -->|Evet| D{Rol?}

    C --> C1[LoginScreen]
    C --> C2[RegisterScreen]
    C --> C3[RoleSelectScreen]

    D -->|buyer| E[BuyerNavigator - Bottom Tabs]
    D -->|seller| F[SellerNavigator - Bottom Tabs]
    D -->|admin| G[AdminNavigator - Stack]

    E --> E1[Ana Sayfa]
    E --> E2[Sepet]
    E --> E3[Siparişlerim]
    E --> E4[Profil]

    F --> F1[Dashboard]
    F --> F2[Ürünlerim]
    F --> F3[Siparişler]
    F --> F4[Mağaza Ayarları]

    G --> G1[Satıcı Onayları]
    G --> G2[Kullanıcı Yönetimi]
    G --> G3[Platform İstatistikleri]
```

---

## 12. Ekran Envanteri

### Auth Ekranları

| Ekran | Dosya | Açıklama |
|-------|-------|----------|
| Giriş | `LoginScreen.tsx` | E-posta + şifre ile giriş |
| Kayıt | `RegisterScreen.tsx` | Rol seçimi + kayıt formu |
| Rol Seçimi | `RoleSelectScreen.tsx` | Alıcı mı, Satıcı mı? |

### Alıcı (Buyer) Ekranları

| Ekran | Dosya | Açıklama |
|-------|-------|----------|
| Ana Sayfa | `HomeScreen.tsx` | Ürün listesi, arama, filtre |
| Ürün Detay | `ProductDetailScreen.tsx` | Fotoğraf, fiyat, stok, sepete ekle |
| Sepet | `CartScreen.tsx` | Sepet öğeleri, miktar, toplam |
| Ödeme | `CheckoutScreen.tsx` | Adres, teslimat seçimi, sipariş onayı |
| Siparişlerim | `OrdersScreen.tsx` | Sipariş geçmişi ve durum takibi |
| Sipariş Detay | `OrderDetailScreen.tsx` | Tek sipariş detayı + iptal butonu |
| Değerlendirme | `ReviewScreen.tsx` | Yıldız + yorum formu |
| Profil | `ProfileScreen.tsx` | Profil düzenleme, çıkış |

### Satıcı (Seller) Ekranları

| Ekran | Dosya | Açıklama |
|-------|-------|----------|
| Dashboard | `SellerDashboardScreen.tsx` | Özet istatistikler, bekleyen siparişler |
| Mağaza Kurulum | `StoreSetupScreen.tsx` | İlk mağaza oluşturma formu |
| Mağaza Ayarları | `StoreSettingsScreen.tsx` | Mağaza bilgilerini düzenleme |
| Ürün Listesi | `ProductListScreen.tsx` | Kendi ürünlerini listeleme |
| Ürün Ekle/Düzenle | `ProductFormScreen.tsx` | Ürün CRUD formu + görsel yükleme |
| Siparişler | `SellerOrdersScreen.tsx` | Gelen siparişler, durum güncelleme |
| Profil | `SellerProfileScreen.tsx` | Satıcı profil yönetimi |

### Admin Ekranları

| Ekran | Dosya | Açıklama |
|-------|-------|----------|
| Dashboard | `AdminDashboardScreen.tsx` | Platform özeti |
| Satıcı Onayları | `SellerApprovalScreen.tsx` | Onay bekleyen mağazalar listesi |
| Kullanıcı Yönetimi | `UserManagementScreen.tsx` | Rol değiştirme, kullanıcı listesi |

---

## 13. Kullanıcı Akışları

### 13.1 Alıcı: Ürün Arama → Sipariş → Değerlendirme

```mermaid
sequenceDiagram
    participant M as Mühendis
    participant App as Baret App
    participant DB as Supabase

    M->>App: Kayıt ol (role: buyer)
    App->>DB: auth.signUp + handle_new_user trigger
    M->>App: Ana sayfada ürün ara
    App->>DB: SELECT products (onaylı mağaza, aktif ürün)
    M->>App: Ürün detayına git, sepete ekle
    M->>App: Checkout — teslimat seç, sipariş ver
    App->>DB: INSERT orders (stok kontrolü RLS ile)
    Note over DB: status = pending
    M->>App: Siparişlerim'den takip et
    Note over DB: seller: pending → preparing → shipped → delivered
    M->>App: Teslim sonrası 4 yıldız + yorum
    App->>DB: INSERT reviews (delivered kontrolü RLS ile)
```

### 13.2 Satıcı: Mağaza → Ürün → Sipariş Yönetimi

```mermaid
sequenceDiagram
    participant N as Nalbur
    participant App as Baret App
    participant DB as Supabase
    participant A as Admin

    N->>App: Kayıt ol (role: seller)
    N->>App: Mağaza oluştur
    App->>DB: INSERT stores (is_approved = false)
    A->>DB: UPDATE stores SET is_approved = true
    N->>App: Ürün ekle (fotoğraf + fiyat + stok)
    App->>DB: Storage upload + INSERT products
    Note over N,DB: Mühendis sipariş verir
    N->>App: Siparişler → durumu güncelle
    App->>DB: UPDATE orders SET status = 'preparing'
```

### 13.3 Admin: Satıcı Onayı

```
1. Admin paneline giriş yap
2. "Onay Bekleyen Mağazalar" listesini gör
3. Mağaza detayını incele (adres, telefon, açıklama)
4. "Onayla" butonuna bas → is_approved = true
5. Mağaza ve ürünleri artık halka açık görünür
```

---

## 14. Servis Katmanı (API Fonksiyonları)

Her servis dosyası `src/services/supabase.ts` client'ını kullanır.

### auth.service.ts

| Fonksiyon | Parametre | Dönüş |
|-----------|-----------|-------|
| `signUp` | email, password, { full_name, phone, role } | Session |
| `signIn` | email, password | Session |
| `signOut` | — | void |
| `getCurrentUser` | — | User \| null |
| `getSession` | — | Session \| null |

### store.service.ts

| Fonksiyon | Açıklama |
|-----------|----------|
| `createStore` | Yeni mağaza oluştur |
| `getStoreById` | Mağaza detayı |
| `getMyStore` | Oturum açmış satıcının mağazası |
| `updateStore` | Mağaza bilgilerini güncelle |
| `getApprovedStores` | Onaylı mağaza listesi |
| `getPendingStores` | Onay bekleyen mağazalar (admin) |
| `approveStore` | is_approved = true (admin) |

### product.service.ts

| Fonksiyon | Açıklama |
|-----------|----------|
| `createProduct` | Yeni ürün ekle |
| `getProducts` | Filtreli ürün listesi (şehir, fiyat, teslimat) |
| `getProductById` | Ürün detayı |
| `getProductsByStore` | Mağazanın ürünleri |
| `updateProduct` | Ürün güncelle |
| `deleteProduct` | Ürün sil (soft: is_active = false) |

### order.service.ts

| Fonksiyon | Açıklama |
|-----------|----------|
| `createOrder` | Sipariş oluştur (stok düşümü) |
| `getMyOrders` | Alıcının siparişleri |
| `getStoreOrders` | Satıcının mağaza siparişleri |
| `updateOrderStatus` | Durum güncelle |
| `cancelOrder` | pending → cancelled |

### review.service.ts

| Fonksiyon | Açıklama |
|-----------|----------|
| `createReview` | Değerlendirme oluştur |
| `getStoreReviews` | Mağaza değerlendirmeleri |
| `getStoreAverageRating` | Ortalama puan hesapla |

### storage.service.ts

| Fonksiyon | Açıklama |
|-----------|----------|
| `uploadProductImage` | Ürün fotoğrafı yükle |
| `uploadStoreLogo` | Mağaza logosu yükle |
| `uploadAvatar` | Profil fotoğrafı yükle |
| `getPublicUrl` | Public URL oluştur |

---

## 15. Sipariş Yaşam Döngüsü

```mermaid
stateDiagram-v2
    [*] --> pending: Mühendis sipariş verir
    pending --> preparing: Nalbur kabul eder
    pending --> cancelled: Mühendis iptal eder
    preparing --> shipped: Nalbur kargoya verir
    preparing --> cancelled: Nalbur iptal eder (admin onayı)
    shipped --> delivered: Teslimat tamamlanır
    delivered --> [*]: Değerlendirme yapılabilir
    cancelled --> [*]
```

| Durum | Türkçe | Kim günceller | Açıklama |
|-------|--------|---------------|----------|
| `pending` | Beklemede | Sistem | Sipariş oluşturuldu, nalbur henüz görmedi |
| `preparing` | Hazırlanıyor | Satıcı | Nalbur siparişi hazırlıyor |
| `shipped` | Yolda | Satıcı | Kargo veya araçla teslimat başladı |
| `delivered` | Teslim Edildi | Satıcı | Teslimat tamamlandı |
| `cancelled` | İptal Edildi | Alıcı / Satıcı | Sipariş iptal edildi |

---

## 16. Gelecek Modüller (RFQ & Komisyon)

### RFQ (Request for Quote) — Faz 5

Mühendisler toptan alım için birden fazla nalbura teklif talebi gönderebilir.

```
rfq_requests   → Mühendisin talebi (ürün, miktar, teslimat tarihi)
rfq_responses  → Nalburların fiyat teklifleri
rfq_awards     → Mühendisin seçtiği teklif → siparişe dönüşür
```

### Komisyon — Faz 5

```
platform_settings  → global komisyon oranı (%8)
order_commissions  → sipariş başına hesaplanan komisyon
seller_payouts     → nalbura ödenecek net tutar
```

---

## 17. Ortam Değişkenleri ve Kurulum

### .env.example

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Hızlı Başlangıç

```bash
# 1. Repoyu klonla
git clone https://github.com/Faruk-T/baret.git
cd baret

# 2. Bağımlılıkları yükle
npm install

# 3. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını Supabase Dashboard → Settings → API'den doldur

# 4. Veritabanını kur
# Supabase SQL Editor'e database.sql dosyasını yapıştır ve çalıştır

# 5. Uygulamayı başlat
npx expo start
```

### İlk Admin Oluşturma

```sql
-- Supabase Dashboard → Authentication → Users → Add user
-- Ardından SQL Editor'de:
UPDATE public.users SET role = 'admin' WHERE email = 'admin@emailiniz.com';
```

---

## 18. Git İş Akışı ve Şirket Prosedürleri (Trunçgil Standartları)

Bu bölüm, **Trunçgil Teknoloji** staj sürecinin "yazılı anayasası" niteliğindeki toplantı kaydına (Kayıt 2026-07-13) dayanır. Aşağıdaki kurallardan **şaşmadan** ilerlenir; her biri staj değerlendirmesini doğrudan etkiler.

Bu proje **GitHub Flow** kullanır.

```
main (production-ready, doğrudan push YASAK)
  │
  ├── feature/auth-screens
  ├── feature/seller-product-crud
  ├── feature/buyer-cart-checkout
  └── fix/order-status-bug
```

### 18.1 Branch ve Commit Kuralları

| Kural | Açıklama |
|-------|----------|
| `main`'e doğrudan push **YASAK** | Ne yapılırsa yapılsın, mutlaka o işe özel yeni bir feature branch açılır |
| Branch nereden açılır? | Branch, elle değil; ilgili **GitHub Issue** içindeki "Create branch" seçeneğinden açılır (isimlendirme otomatik ve kurallara uygun olur) |
| Commit granülerliği | Günlük iş, tek büyük commit yerine mantıklı parçalara bölünür (ör. "iskeleti kur", "formu tasarla", "validasyon ekle") — parça parça, çok sayıda commit |
| Commit mesaj dili | **İngilizce**, imperative mood: `add auth service`, `fix cart total calculation` |
| Commit ≠ PR | Her commit için ayrı PR açılmaz; PR gün sonunda, birikmiş commit'lerle **bir defa** açılır |

### 18.2 Pull Request (PR) Süreci ve Reviewer

1. Gün boyunca kendi branch'inde commit'ler atılır.
2. İş bittiğinde (gün sonunda) **bir** Pull Request açılır.
3. PR açıklamasına ne yapıldığı yazılır; mümkünse ekran görüntüsü/fotoğraf eklenir.
4. PR açıklamasına ilgili Issue'yu kapatan ifade yazılır: `Closes #16` → PR onaylanınca Issue otomatik "Done" sütununa geçer.
5. PR'ın sağındaki **Reviewers** alanına **Ümit Bey** eklenir.
   - Eklenemiyorsa: önce repoya **Collaborator** olarak davet edilip kabul etmesi beklenir.
6. Ümit Bey PR'ı inceleyip onaylayınca kod `main`'e geçer. Onay öncesi `main`'e hiçbir şey girmez.

### 18.3 Mesai ve Commit Saatleri Takibi

| Kural | Açıklama |
|-------|----------|
| Katı mesai saati yok | Çalışma saatleri, sistemdeki yapay zeka tarafından **commit saatlerine** bakılarak otomatik hesaplanır |
| Sabah commit'i | Mesaiye başlarken (ör. 10:00–11:00 arası) ufak bir iş yapılıp **ilk commit** atılır |
| Akşam commit'i | Gün sonunda işi bırakırken **son commit** atılır — sistem bu iki saat arasını "aktif çalışma" olarak algılar |
| Zorunlu günlük commit | Hafta içi **her gün en az 1 commit** zorunludur; atılmazsa o gün "yok" (çalışmamış) yazılır |
| Hafta sonu | İş günü sayılmaz, commit zorunluluğu yoktur |

### 18.4 Staj Defteri (Günlük Kayıt) Prosedürü

Her mesai gününün **sonunda** aşağıdaki adımlar uygulanır:

1. [truncgil.com/stajyer/panel](https://truncgil.com/stajyer/panel) adresine giriş yapılır.
2. Panelde GitHub **Public Repo URL**'si girilip **"Git Commitlerini Çek"** butonuna basılır (o günün tüm commit'leri otomatik çekilir).
3. Hemen altına o gün yapılanlar özetlenip **"Deftere Kaydet"** denir.
4. Bu işlem **günü gününe** yapılır; geriye dönük toplu doldurma yapılmaz.

### 18.5 Kanban Board, Issues ve Milestones

| Araç | Kural |
|------|-------|
| **Issue** | İşe başlamadan önce GitHub Projects üzerinden bir Issue (görev kartı) açılır |
| **Branch oluşturma** | Issue içindeki "Create branch" seçeneğiyle açılır (manuel branch açılmaz) |
| **Otomasyon** | PR açıklamasında `Closes #16` varsa, PR onaylandığında Issue otomatik **In Progress → Done** sütununa geçer |
| **Milestones** | Görevler faza göre gruplanır (ör. "Phase 1"); ilerleme yüzdesi Milestones ekranından takip edilir |

### 18.6 Etiket (Label) Sistemi

| Label | Anlam |
|-------|-------|
| `type:bug` | Hata düzeltme |
| `type:feature` | Yeni özellik |
| `priority:high` | Acil müdahale |
| `documentation` | Dokümantasyon güncellemesi |

### 18.7 Günlük İş Döngüsü (Özet Akış)

```
1. Sabah: Issue seç → "Create branch" ile branch aç → küçük bir iş yap → 1. commit (sabah)
2. Gün içinde: Mantıklı parçalara bölünmüş çok sayıda İngilizce commit
3. Akşam: Son commit → PR aç (Closes #N, açıklama + ekran görüntüsü) → Reviewer: Ümit Bey
4. Panel: truncgil.com/stajyer/panel → "Git Commitlerini Çek" → günün özetini yaz → "Deftere Kaydet"
5. Ümit Bey PR'ı onaylar → main'e merge → Issue otomatik "Done" olur
```

> **Neden bu kadar kritik?** Toplantıda üstüne basa basa vurgulanan üç ana kural: (1) planlı ve **gün gün** ilerlemek, (2) hiçbir şeyi doğrudan `main`'e atmadan **PR + onay** süreciyle ilerlemek, (3) sabah/akşam ufak commit'lerle sistemde **aktif** görünmek. Bu kurallara uyulmazsa o gün "çalışılmamış" sayılır. Proje iyi tamamlanırsa şirket web sitesinde referans olarak yayınlanabilir.

---

## 19. Test Stratejisi

| Seviye | Araç | Kapsam |
|--------|------|--------|
| **Manuel** | Expo Go / Simülatör | Tüm ekran akışları |
| **Servis** | Supabase Dashboard | CRUD işlemleri, RLS doğrulama |
| **RLS** | SQL Editor | Politika ihlali senaryoları |
| **Birim (gelecek)** | Jest | formatters, validators |
| **E2E (gelecek)** | Detox / Maestro | Kritik kullanıcı akışları |

### Manuel Test Kontrol Listesi

- [ ] Alıcı kayıt → giriş → çıkış
- [ ] Satıcı kayıt → mağaza oluştur → admin onayı → ürün ekle
- [ ] Alıcı ürün ara → sepete ekle → sipariş ver
- [ ] Satıcı sipariş durumu güncelle (pending → delivered)
- [ ] Alıcı teslim sonrası değerlendirme bırak
- [ ] Onaysız mağaza ürünleri görünmemeli
- [ ] Stok yetersizse sipariş oluşturulamamalı
- [ ] pending dışı sipariş iptal edilememeli

---

##### 📍 Faz 1: Proje Hazırlığı, Analiz ve Tasarım (Gün 1 – Gün 6)
**Amaç:** Kodlama yapılmaz; projenin temelleri, veritabanı teorisi, görsel mockup'lar (UI/UX) ve GitHub proje yönetimi altyapısı (Issues/Milestones) hazırlanır. **6 günden** oluşur.

| Gün | Görev | Durum |
| ------ | ------ | ------ |
| Gün 1 (Pzt) | Proje fikri onayı, hedef kitle analizi, GitHub repo + Issues/Milestones panel kurulumu | ✅ Tamamlandı |
| Gün 2 (Pzt) | `implementation_plan.md` hazırlanması (4 fazlı yol haritası), Tech Stack belirlenmesi | ✅ Tamamlandı |
| Gün 3 (Sal) | Supabase veritabanı mimarisi tasarımı, ER ilişkileri, `database.sql` şemasının yazılması | ✅ Tamamlandı |
| Gün 4 (Çar) | AI/Figma ile temel ekran mockup'ları (Ana sayfa, Ürün Detay, Sepet) | ✅ Tamamlandı |
| Gün 5 (Per) | Mockup'ların `assets/` klasörüne eklenmesi, README güncelleme | ✅ Tamamlandı |
| Gün 6 (Cum) | Faz 1 kapanışı: Issue'ları güncelleme, PR açıp Ümit Bey'i reviewer ekleme, staj defterine Faz 1 özeti kaydetme | ✅ Tamamlandı |

--------------------------------------------------------------------------------

##### 📍 Faz 2: Altyapı Kurulumu ve Veritabanı (Gün 7 – Gün 11)
**Amaç:** Tasarımlar koda dökülür; Expo projesi, Supabase backend ve Auth altyapısı inşa edilir. **5 günden** oluşur. Faz 1'in 6. günü ✅ olmadan bu fazın hiçbir günü başlatılamaz.

| Gün | Görev | Durum |
| ------ | ------ | ------ |
| Gün 7 (Pzt) | Expo projesi başlatma, klasör mimarisi, NativeWind kurulumu | ✅ Tamamlandı |
| Gün 8 (Sal) | Supabase projesi, SQL tabloları ve Enum tipleri entegrasyonu | ✅ Tamamlandı |
| Gün 9 (Çar) | RLS politikaları ve Trigger'lar (`database.sql`) | ✅ Tamamlandı |
| Gün 10 | React Navigation kurulumu, boş ekran taslakları, yönlendirme testi | ✅ Tamamlandı |
| Gün 11 | Supabase Auth: Login/Register ekranları (Alıcı + Satıcı rolleri) | ✅ Tamamlandı |

--------------------------------------------------------------------------------

##### 📍 Faz 3: Satıcı ve Müşteri Ekosistemi (Gün 12 – Gün 16)
**Amaç:** Nalbur ve mühendis taraflarının temel iş akışları (ürün, sepet, sipariş) kodlanır. **5 günden** oluşur.

| Gün | Görev | Durum |
| ------ | ------ | ------ |
| Gün 12 | Satıcı mağaza profili oluşturma + ürün CRUD formları | ✅ Tamamlandı |
| Gün 13 | Supabase Storage entegrasyonu, ürün görseli yükleme | ✅ Tamamlandı |
| Gün 14 | Alıcı ana sayfa ürün akışı, kategori arama ve filtreleme | ✅ Tamamlandı |
| Gün 15 | Ürün detay sayfası, stok kontrolü, Sepet state (CartContext) | ✅ Tamamlandı |
| Gün 16 | Checkout, adres bilgisi, teslimat seçenekleri, sipariş oluşturma | ✅ Tamamlandı |

--------------------------------------------------------------------------------

##### 📍 Faz 4: Yönetim, Optimizasyon ve Kapanış (Gün 17 – Gün 20)
**Amaç:** Admin paneli, değerlendirme sistemi, test ve canlı demo hazırlığı tamamlanır. **4 günden** oluşur.

| Gün | Görev | Durum |
| ------ | ------ | ------ |
| Gün 17 | Değerlendirme sistemi (1–5 yıldız + yorum) + Admin satıcı onay mekanizması (`is_approved`) | ✅ Tamamlandı |
| Gün 18 | Bug fixing, performans optimizasyonu, gereksiz re-render önleme | ✅ Tamamlandı |
| Gün 19 | Son testler, refactoring, dokümantasyon tamamlama | ✅ Tamamlandı |
| Gün 20 | Canlı demo hazırlığı (APK/Simülatör), son PR → main merge | ⬜ Bekliyor |

### İlerleme Özeti

```
Faz 1: ██████████ 100%  (6/6 gün tamamlandı)
Faz 2: ██████████ 100%  (5/5 gün tamamlandı)
Faz 3: ██████████ 100%  (5/5 gün tamamlandı)
Faz 4: ████████░░  80%  (Gün 17–19 tamam; Gün 20 açık)
────────────────────────────────────────
Toplam: ███████████████████░  95%  (19/20 gün)
```

> **Gün 18–19 tamamlandı:** Ürün soft-delete (`is_active`), `formatTRY` / `ProductThumb`, admin platform istatistikleri + kullanıcı listesi, profil/sepet polish. Kanıt: `seller-products-soft-delete.png`, `buyer-home-*-soft-delete.png`.

> **Gün 17 tamamlandı:** Admin mağaza onay UI + teslim sonrası 1–5 yıldız/yorum. Kanıt: `buyer-orders-reviews.png`, `seller-dashboard-reviews*.png`.

> **Gün 16 tamamlandı:** Checkout, sipariş listeleri, tab ikonları. Kanıt: `checkout-screen.png`, `buyer-orders.png`, `seller-orders-*.png`.

### Faz 1 Kapanış Özeti

Faz 1 boyunca kod yazılmadan projenin analiz, tasarım ve dokümantasyon temelleri atıldı. Aşağıda gün bazlı özet ve teslim edilen çıktılar yer alır.

| Gün | Tamamlanan İş | Çıktı |
|-----|---------------|-------|
| Gün 1 | Proje fikri onayı, hedef kitle analizi, GitHub repo + Issues/Milestones kurulumu | GitHub repo, Kanban panel |
| Gün 2 | Kapsamlı geliştirme planı ve Tech Stack belirlenmesi | `implementation_plan.md` |
| Gün 3 | Supabase veritabanı mimarisi, ER ilişkileri, RLS tasarımı | `database.sql` |
| Gün 4 | Alıcı akışı UI mockup'ları (Ana Sayfa, Ürün Detay, Sepet) | `assets/mockups/*.png` |
| Gün 5 | Mockup'ların README vitrininde sergilenmesi | `README.md` UI Mockups bölümü |
| Gün 6 | Faz 1 kapanışı, teslim tablosu, plan finalizasyonu | Bu özet, PR, staj defteri |

**Faz 1 teslim kontrol listesi:**

- [x] `implementation_plan.md` — 4 fazlı 20 günlük yol haritası hazır
- [x] `database.sql` — 5 tablo, ENUM, FK, trigger, RLS politikaları
- [x] UI mockup'ları — Ana Sayfa, Ürün Detay, Sepet (`assets/mockups/`)
- [x] README vitrini — mockup sergileme + tasarım dili tablosu
- [x] GitHub Issues / Milestones / Kanban — proje takibi aktif
- [x] Gün 6 PR açıldı — Ümit Bey review bekliyor

**Faz 2'ye geçiş notu:** Pazartesi (Gün 7) itibarıyla Expo projesi, Supabase entegrasyonu ve Auth altyapısına geçilecektir. Faz 1'de hazırlanan `database.sql` ve mockup'lar Faz 2 implementasyonunun referansı olacaktır.

---

## 21. Riskler ve Bağımlılıklar

| Risk | Etki | Önlem |
|------|------|-------|
| Supabase free tier limitleri | Storage ve API kotası aşılabilir | Görsel boyutlarını optimize et, pagination kullan |
| Tek ürünlü sipariş modeli | Çoklu ürün sepeti desteklenmez | MVP kabul edildi; Faz 5'te `order_items` tablosu |
| Konum izni reddi | Konum bazlı arama çalışmaz | Şehir/ilçe manuel filtre fallback |
| Admin tek kişi | Onay gecikmesi | MVP'de manuel; gelecekte auto-approve kuralları |
| Ödeme entegrasyonu yok | Sipariş ödeme dışı | MVP'de "kapıda ödeme" varsayımı |
| Expo SDK güncellemeleri | Breaking changes | `package.json` sürümlerini sabitle |

---

## 22. Teslim Kriterleri (Definition of Done)

Proje **tamamlanmış** sayılır ancak aşağıdaki kriterlerin tümü sağlandığında:

### Fonksiyonel
- [ ] 3 rol (buyer, seller, admin) kayıt/giriş yapabilir
- [ ] Satıcı mağaza oluşturur, admin onaylar
- [ ] Satıcı ürün ekler (fotoğraf + fiyat + stok)
- [ ] Alıcı ürün arar, sepete ekler, sipariş verir
- [ ] Satıcı sipariş durumunu günceller
- [ ] Alıcı teslim sonrası değerlendirme bırakır

### Teknik
- [ ] Tüm ekranlar NativeWind ile stillendirilmiş
- [ ] TypeScript tip hatası yok
- [ ] RLS politikaları test edilmiş
- [ ] `.env` git'e eklenmemiş
- [ ] `database.sql` repo'da güncel

### Dokümantasyon
- [ ] README kurulum adımlarını içeriyor
- [ ] `implementation_plan.md` güncel
- [ ] Mockup görselleri `assets/mockups/` altında

### Git ve Şirket Prosedürleri (Bkz. Bölüm 18)
- [ ] Tüm feature branch'ler Issue üzerinden açılmış ve PR ile merge edilmiş
- [ ] Her PR'da Ümit Bey reviewer olarak eklenmiş
- [ ] Her PR açıklamasında `Closes #N` ile ilgili Issue kapatılmış
- [ ] Hafta içi her gün en az 1 commit atılmış (sabah + akşam)
- [ ] Her mesai günü staj defterine (truncgil.com/stajyer/panel) kayıt girilmiş
- [ ] `main` dalı çalışır durumda
- [ ] Son demo APK veya simülatör kaydı hazır

---

> **Bu doküman canlıdır.** Her faz tamamlandıkça ilgili bölümler güncellenmelidir. Değişiklik yaparken "Son güncelleme" tarihini ve ilerleme yüzdelerini güncelleyin.

---

# 🪖 Baret — Tam Kapsamlı Kod Analizi, B2B Ticarileştirme Araştırması ve Uçtan Uca Uygulama Planı (`implementation_plan.md`)

Bu doküman; **Baret (İnşaat & Nalbur Pazaryeri)** projesinin mevcut kaynak kodunun ve veritabanı mimarisinin satır satır analizini, global/yerel B2B inşaat tedarik pazarı araştırmasını, mevcut kodda tespit edilen **kritik teknik/mantıksal hataları** ve uygulamayı **Android + iOS (App Store) + Kurumsal B2B Web Portalı** olarak ticarileştirecek **8 Fazlı Başlangıçtan Bitişe Mühendislik Planını** içerir.

---

## BÖLÜM 1: Mevcut Projenin Baştan Sona Teknik Analizi

### 1.1. Teknoloji Yığını ve Mimari Özeti
* **Çerçeve & 런타임:** Expo SDK 57 (`~57.0.25`), React Native `0.86.3`, React `19.2.3`, TypeScript `~6.0.3` ([`package.json`](file:///c:/Users/user/baret/package.json#L5-L43)).
* **Stil & UI:** NativeWind v4 (`^4.2.6`) + TailwindCSS v3 (`^3.4.19`) ve ortak tasarım tokenları ([`src/theme/ui.ts`](file:///c:/Users/user/baret/src/theme/ui.ts#L1-L26)).
* **Navigasyon:** React Navigation v7 (`native-stack` + `bottom-tabs`), rol bazlı koşullu yönlendirme ([`src/navigation/RootNavigator.tsx`](file:///c:/Users/user/baret/src/navigation/RootNavigator.tsx#L15-L48)).
* **Backend & Veritabanı:** Supabase (`@supabase/supabase-js` v2.110.7) — PostgreSQL, Row Level Security (RLS), PL/pgSQL RPC fonksiyonları, Trigger'lar, Realtime kanalları ve `product-images` Storage bucket'ı ([`database.sql`](file:///c:/Users/user/baret/database.sql#L1-L1158)).
* **Durum Yönetimi:** `AuthContext` ([`src/context/AuthContext.tsx`](file:///c:/Users/user/baret/src/context/AuthContext.tsx)) ve `AsyncStorage` destekli tek mağaza kısıtlı `CartContext` ([`src/context/CartContext.tsx`](file:///c:/Users/user/baret/src/context/CartContext.tsx)).
* **Tanıtım Sitesi:** `landing/` dizininde GSAP + Lenis ile hazırlanmış statik tanıtım, gizlilik ve hesap silme sayfaları ([`landing/index.html`](file:///c:/Users/user/baret/landing/index.html)).

```mermaid
flowchart TB
    subgraph Clients["İstemci Katmanı (Hedef: Tek Kod Tabanı / 3 Platform)"]
        AND["📱 Android App (Google Play)"]
        IOS["🍎 iOS App (App Store / TestFlight)"]
        WEB["💻 Kurumsal B2B Web Portalı (Desktop & Mobil Web)"]
    end

    subgraph AppCore["Uygulama Çekirdeği (src/)"]
        NAV["Adaptive Navigation Shell\n(Mobile Tabs vs Web Sidebar/MegaHeader)"]
        CTX["State & Context\n(Auth, Multi-Line Cart, Active Jobsite, Modals)"]
        SRV["Servis Katmanı\n(catalog, orders, rfq, plans, storage, admin)"]
    end

    subgraph Supabase["Supabase Backend & B2B Engine"]
        AUTH["Supabase Auth\n(Email, Apple Sign-In, Recovery)"]
        DB[("PostgreSQL + RLS\n(users, stores, products, orders, order_items, rfqs, quotes)")]
        RT["Supabase Realtime\n(Sipariş, Teklif & Bildirim Köprüsü)"]
        ST["Supabase Storage\n(product-images, Vergi Levhası / İrsaliye)"]
    end

    AND --> NAV
    IOS --> NAV
    WEB --> NAV
    NAV --> CTX
    CTX --> SRV
    SRV --> AUTH
    SRV --> DB
    SRV --> RT
    SRV --> ST
```

---

### 1.2. Kod Denetiminde Tespit Edilen Kritik Hatalar (Acil Düzeltilmesi Gerekenler)

> [!CAUTION]
> Mevcut kod tabanında ve [`database.sql`](file:///c:/Users/user/baret/database.sql) dosyasında canlı kullanımı ve ticarileştirmeyi doğrudan engelleyen **8 kritik teknik bulgu** tespit edilmiştir:

1. **Lisans Anahtarı Aktivasyonunu Bozan SQL Trigger Çakışması (Kritik Bug):**
   * [`redeem_license_key()`](file:///c:/Users/user/baret/database.sql#L367-L375) fonksiyonu `PERFORM set_config('baret.allow_license_update', 'on', true);` çalıştırıp `stores.license_expires_at` sütununu güncelliyor.
   * Ancak dosyanın sonunda yer alan [`protect_store_admin_columns()`](file:///c:/Users/user/baret/database.sql#L1113-L1135) trigger'ı `current_setting('baret.allow_license_update', true)` değerini **kontrol etmiyor**! Satıcı admin olmadığı için `NEW.license_expires_at := OLD.license_expires_at` diyerek tarihi sessizce eski haline çeviriyor, fakat `license_keys` tablosunda anahtarı "kullanıldı" (`redeemed_at = NOW()`) olarak işaretliyor. Anahtar yanıyor ama mağaza lisansı uzamıyor!

2. **Çift Yetkilendirme Karmaşası (`license_expires_at` vs `store_subscriptions`):**
   * Projede önce "Lisans Anahtarı" (`stores.license_expires_at`) yapılmış, sonra "Abonelik Paketleri" (`store_subscriptions`) eklenmiş.
   * Alıcı kataloğu ([`src/services/catalog.ts`](file:///c:/Users/user/baret/src/services/catalog.ts#L60)) ve RLS politikaları ([`database.sql`](file:///c:/Users/user/baret/database.sql#L244-L256)) hâlâ `stores.license_expires_at > NOW()` şartına bakarken; ürün ekleme trigger'ı ([`enforce_product_plan_limit`](file:///c:/Users/user/baret/database.sql#L976-L1005)) `store_subscriptions` tablosuna bakıyor.
   * Admin [`AdminSubscriptionsScreen.tsx`](file:///c:/Users/user/baret/src/screens/admin/AdminSubscriptionsScreen.tsx) ekranından bir mağazaya Basic/Pro paket atadığında `stores.license_expires_at` güncellenmediği için satıcı ürün ekleyebiliyor ama **mağazası ve ürünleri alıcı kataloğunda görünmüyor**!

3. **Abonelik Modeline Geçilmesine Rağmen Hâlâ %10 Komisyon Kesen Trigger:**
   * Arayüzde *"komisyon yok (abonelik modeli)"* ([`SellerDashboardScreen.tsx`](file:///c:/Users/user/baret/src/screens/seller/SellerDashboardScreen.tsx#L247)) yazmasına rağmen, veritabanında [`trg_orders_create_commission`](file:///c:/Users/user/baret/database.sql#L431-L434) her yeni siparişte %10 komisyon kaydı oluşturmaya devam ediyor ve [`SellerOrdersScreen.tsx`](file:///c:/Users/user/baret/src/screens/seller/SellerOrdersScreen.tsx#L336-L357) satıcıya *"Platform -₺... (%10)"* gösteriyor.

4. **Satıcı Sipariş Aksiyonlarında Çift (Duplicate) Bildirim Gönderimi:**
   * Hem servis katmanındaki [`updateSellerOrderStatus` / `cancelSellerOrder` / `confirmOrderPickup`](file:///c:/Users/user/baret/src/services/orders.ts#L272-L304) fonksiyonları hem de ekran katmanındaki [`SellerOrdersScreen.tsx`](file:///c:/Users/user/baret/src/screens/seller/SellerOrdersScreen.tsx#L98-L188) aynı anda `notifyBuyerOrderStatus` çağırıyor. Alıcıya her durum değişiminde **2 adet aynı bildirim** düşüyor.

5. **Sepetteki Her Ürün İçin Ayrı Sipariş Satırı ve Ayrı Teslim Kodu Üretilmesi:**
   * `order_items` tablosu olmadığı için [`createOrdersFromCart`](file:///c:/Users/user/baret/src/services/orders.ts#L85-L103) sepetteki 5 farklı ürün için `orders` tablosuna 5 bağımsız sipariş kaydı açıyor. Satıcı 5 kez "Hazırlanıyor -> Yola Çıktı" yapmak ve alıcı mağazada **5 ayrı 6 haneli teslim kodu** söylemek zorunda kalıyor.

6. **Ürünlerde Gerçek `category`, `unit` (Birim) ve `brand` Sütunu Olmaması:**
   * [`products`](file:///c:/Users/user/baret/database.sql#L59-L72) tablosunda `category` sütunu yok! [`listCatalogProducts`](file:///c:/Users/user/baret/src/services/catalog.ts#L68-L71) kategori filtresini `name.ilike.%kategori%` ile yapıyor. Satıcı ürün adını *"Nuh 50kg CEM I 42.5"* yazarsa ve içinde *"Çimento"* kelimesi geçmezse ürün **Çimento kategorisinde çıkmıyor**. Ayrıca satıcı ürün eklerken kategori bile seçemiyor ([`ProductFormScreen.tsx`](file:///c:/Users/user/baret/src/screens/seller/ProductFormScreen.tsx)).

7. **Web ve Android'de Kırılan `Alert.alert` Kullanımı:**
   * [`OrdersScreen.tsx`](file:///c:/Users/user/baret/src/screens/buyer/OrdersScreen.tsx#L129-L147) içindeki şikayet menüsü `Alert.alert` içine **4 buton** gönderiyor. Android native `AlertDialog` en fazla 3 butonu destekler (4. buton görünmez). Web'de ise `Alert.alert` çoklu buton callback'lerini **hiç çalıştırmaz** (sepet temizleme, sipariş iptali, mağaza çakışması onayları Web'de çalışmaz).

8. **Web Platformunda Çöken Native Modüller:**
   * **Görsel Yükleme:** [`src/services/storage.ts`](file:///c:/Users/user/baret/src/services/storage.ts#L44-L63) `expo-file-system/legacy` `FileSystem.cacheDirectory` kullanıyor. Web'de `cacheDirectory` `null` olduğu için satıcı Web'den ürün fotoğrafı yükleyemez (`"Görsel okunamadı. Önbellek kullanılamıyor."` hatası verir).
   * **Tarih Seçici:** [`LicenseKeysScreen.tsx`](file:///c:/Users/user/baret/src/screens/admin/LicenseKeysScreen.tsx#L148-L157) `@react-native-community/datetimepicker` kullanıyor; Web'de desteklenmez.
   * **Harita Yönlendirmesi:** [`src/utils/geo.ts`](file:///c:/Users/user/baret/src/utils/geo.ts#L54-L66) `Platform.OS === 'ios'` dışındaki tüm platformları Android varsayarak Web'de `geo:` protokolünü açmaya çalışıyor.
   * **Шifre Sıfırlama & Auth URL:** [`src/services/supabase.ts`](file:///c:/Users/user/baret/src/services/supabase.ts#L22) `detectSessionInUrl: false` olarak sabitlenmiş.

---

## BÖLÜM 2: Web & Pazar Araştırması — Baret Nasıl "Arşa Çıkar" ve Ticarileşir?

Globalde **Schüttflix** (Avrupa'nın en hızlı büyüyen inşaat malzemesi pazaryeri), **Ferguson**, **Grainger**, **Material Bank** ve Türkiye'deki B2B tedarik dinamikleri incelendiğinde; inşaat ve nalbur sektöründe bir uygulamanın "oyuncak" olmaktan çıkıp **milyonlarca TL hacim döndüren ticari bir B2B/B2C platforma** dönüşmesi için şu **6 Stratejik Sütun** şarttır:

### 2.1. Teklif Usulü Satınalma (RFQ / Metraj & İhale Motoru) — *En Büyük B2B Farkı*
İnşaat mühendisleri ve satınalma şefleri 1 adet çekiç alırken sepete ekler; ancak şantiyeye **300 torba çimento, 4 ton demir, 200 m² seramik** alırken katalog fiyatından sepete eklemez, **fiyat teklifi (RFQ - Request for Quote)** toplar!
* **Nasıl Çalışacak?** Alıcı (Mühendis/Müteahhit) **"Toplu Teklif İste (İhale Aç)"** ekranından kalem kalem malzeme listesini, teslim edilecek şantiyeyi ve termin tarihini girer.
* O şehirdeki onaylı nalburlara anında bildirim düşer: *"🔥 Yeni Şantiye İhalesi: Şehitkamil / Gaziantep — 14 Kalem Malzeme"*.
* Nalburlar kendi özel iskontolu fiyatlarını ve nakliye şartlarını teklif olarak iletir. Mühendis gelen teklifleri yan yana karşılaştırır (Fiyat, Teslim Süresi, Mağaza Puanı) ve **tek tıkla siparişe dönüştürür**.

### 2.2. Kademeli Toptan Fiyatlandırma (Tiered Pricing) & İnşaat Birim Sistemi
Nalburiyede her ürün "Adet" ile satılmaz ve 1 adet alan ile 1 palet alan aynı fiyatı ödemez.
* **Birim Desteği:** Her ürüne `unit` (`adet`, `torba`, `palet`, `ton`, `kg`, `m2`, `metre`, `koli`, `ova/teneke`) ve `min_order_quantity` (Minimum Sipariş Adedi) eklenecek.
* **Kademeli Fiyat (Bulk Pricing Tiers):** Satıcı bir ürüne isteğe bağlı toptan fiyat basamakları tanımlayabilecek:
  * `1 – 19 Torba:` **₺240 / torba**
  * `20 – 49 Torba (1 Palet):` **₺220 / torba** (%8 İndirim)
  * `50+ Torba:` **₺205 / torba** (%15 Şantiye İndirimi)
  Sepette miktar arttıkça birim fiyat otomatik olarak ilgili kademeye düşecek!

### 2.3. Çoklu Şantiye (Project / Jobsite) & Kurumsal الفatura Profilleri
Bir inşaat firmasının aynı anda 3 farklı şantiyesi olabilir.
* Alıcılar **"Şantiyelerim"** altında birden fazla teslimat noktası kaydedebilecek (Örn: *"Kuzeyşehir Konut Şantiyesi — Blok B"*, GPS Koordinatı, Şantiye Şefi Adı/Tel, *"Tır Girebilir / Forklift Var"* lojistik notu).
* Kurumsal Fatura bilgileri (Firma Ünvanı, Vergi Dairesi, Vergi No, E-Fatura Mükellefi mi?) profilde tanımlanacak ve her siparişe otomatik eklenecek.

### 2.4. Web'de "B2B Hızlı Sipariş Tablosu" (Excel Benzeri Quick-Order DataGrid)
Daha önce geliştirdiğiniz B2B projesindeki gibi, kurumsal alıcılar ve satınalma uzmanları Web'de kart kart gezinmek yerine **yüksek yoğunluklu tablo görünümünü (DataGrid)** tercih eder:
* Tek ekranda 25–50 satır ürün (SKU, Ürün Adı, Kategori, Mağaza, Birim, Kademeli Fiyat, Canlı Stok, Hızlı Miktar Kutusu `[ 0 ]` ve Toplu Sepete Ekle).
* Satıcılar için de Web'de **Toplu Fiyat & Stok Güncelleme Tablosu** (Enflasyon/kur değişiminde tek ekrandan tüm ürünlere `%10 zam uygula` veya satır içi hızlı fiyat/stok değiştir).

### 2.5. Gerçek Birleşik Sipariş (`orders` + `order_items`) & QR Teslim Kodu
* Sepet onaylandığında tek bir ana `orders` kaydı (Sipariş No: `#BRT-2026-8492`) ve altında `order_items` satırları oluşacak.
* Tek bir 6 haneli teslim kodu üretilecek; ayrıca hem Alıcı ekranında **QR Kod** gösterilecek hem de Web'den **Sipariş İrsaliye / Teklif PDF Çıktısı (Yazdır)** alınabilecek.

### 2.6. Hibrit Gelir Modeli (SaaS Abonelik + Ödeme Geçidi + Öne Çıkan Vitrin)
1. **Satıcı SaaS Aboneliği:** Basic / Pro / Kurumsal paketler (Yıllık ödemede 2 ay bedava kurgusu).
2. **Ödeme Altyapısı (iyzico / PayTR Marketplace veya Havale/EFT Dekont + Nakit/Kredi Kartı Kapıda):** Alıcı siparişi oluştururken ödeme yöntemini seçer (*Online Kredi Kartı / Şantiyede POS / Havale-EFT / Cari Açık Hesap*).
3. **Sponsorlu Ürün / Vitrin Mağaza:** Nalburların ürünlerini aramada en üstte çıkarması için ek gelir kalemi.

---

## BÖLÜM 3: iOS (App Store) Uyumluluk ve Kabul Stratejisi

> [!IMPORTANT]
> Apple App Store inceleme ekibi (App Review), pazaryeri ve B2B uygulamalarını **4 katı kurala** göre denetler. Mevcut haliyle uygulama App Store'a gönderilirse **kesin olarak red (rejection) alacağı** noktalar ve çözümlerimiz şunlardır:

| Apple Kuralı | Mevcut Durum (Sorun) | Çözüm Planımız |
| :--- | :--- | :--- |
| **Guideline 5.1.1 — Zorunlu Giriş Duvarı (Login Wall)** | Uygulama açılır açılmaz `LoginScreen` geliyor. Kullanıcı ürünleri görmeden hesap açmaya zorlanıyor. | **Misafir Modu (Guest Mode):** Uygulama doğrudan Alıcı Kataloğu (`BuyerNavigator`) ile açılacak! Kullanıcı üye olmadan ürünleri arayabilecek, filtreleyebilecek, mağaza puanlarını görebilecek ve sepete ekleyebilecek. Yalnızca **Sipariş Ver (Checkout)**, **Teklif İste (RFQ)**, **Siparişlerim** veya **Satıcı Ol** dediğinde şık bir Giriş/Kayıt ekranına yönlendirilecek. |
| **Guideline 5.1.1(v) — Uygulama İçi Hesap Silme** | Uygulama içinde hesap silme butonu yok; web sayfasında *"e-posta gönderin"* yazıyor. Apple e-posta ile silmeyi **kabul etmez**. | [`ProfileScreen.tsx`](file:///c:/Users/user/baret/src/screens/buyer/ProfileScreen.tsx) ve [`StoreSettingsScreen.tsx`](file:///c:/Users/user/baret/src/screens/seller/StoreSettingsScreen.tsx) içine **"Hesabımı Kalıcı Olarak Sil"** butonu ve Supabase `delete_my_account()` RPC fonksiyonu eklenecek. |
| **Guideline 3.1.1 & 3.1.3(e) — In-App Purchase (IAP) Tuzağı** | Satıcı ekranında `₺4.000/ay` paket fiyatları ve `BARET-XXXX-XXXX` lisans kodu kutusu var. Apple, dijital özellik/sekme açan kodları IAP (%30 Apple komisyonu) sayıp reddeder. | iOS (`Platform.OS === 'ios'`) üzerinde Satıcı paneli **"Kurumsal B2B Satıcı Terminali"** (Reader/Multiplatform B2B) olarak çalışacak: iOS içinde dış ödeme linki veya ücretli lisans kodu satın alma çağrısı gösterilmeyecek; kurumsal abonelik ve lisans işlemleri **Baret Web Portalı** üzerinden yönetilecek. Böylece Apple'a %30 komisyon ödemeden App Store'dan %100 onay alınacak! |
| **Guideline 4.8 — Sign in with Apple / İzin Metinleri** | Yalnızca E-posta/Şifre var; iOS izin metinleri (`infoPlist`) eksik kamera izni içeriyor. | E-posta/Şifre tek başına Guideline 4.8'i ihlal etmez ancak iOS'ta kamera ile ürün fotoğrafı çekimi için `NSCameraUsageDescription` eklenecek ve iOS klavye/safe-area davranışları kusursuzlaştırılacak. |

---

## BÖLÜM 4: Kurumsal B2B Web Tasarım Sistemi ("Industrial Precision")

Web sürümünde mobil ekranın masaüstünde sağa-sola çekilmiş amatör görüntüsü yerine, **20 yıllık kurumsal yazılım mimarisi standartlarında** duyarlı (responsive) bir **Web Application Shell** inşa edeceğiz:

### 4.1. Tasarım Dili ve Estetik Kimlik
* **Renk Paleti:**
  * **Endüstriyel Koyu (Sidebar / Komuta Merkezi):** `#0B1220` (Derin Antrasit Lacivert), `#151D2E` (Kart Yüzeyi), `#1E293B` (Kenarlık).
  * **Baret Turuncusu (Vurgu / Aksiyon):** `#FF6B00` (Birincil), `#E55F00` (Hover), `#FFF1E6` (Yumuşak Rozet Arka Planı).
  * **Çalışma Alanı (Katalog & DataGrid):** `#F8FAFC` / `#FFF8F3` sıcak taş beyazı zemin, `#FFFFFF` yüksek kontrastlı kartlar ve tablolar.
* **Tipografi & Yoğunluk:** Masaüstünde geniş ekranı (`max-width: 1440px`) kullanan çok sütunlu yapı, `tabular-nums` (fiyatların ve stokların virgül hizalı durması), klavye kısayolları ve pürüzsüz hover/focus geçişleri.

### 4.2. Masaüstü (Web `>= 1024px`) vs Mobil (`< 768px`) Adaptif Yerleşim

```mermaid
flowchart LR
    subgraph DesktopWeb["💻 Masaüstü B2B Web Görünümü (>= 1024px)"]
        direction TB
        TOP["Üst Kurumsal Mega-Bar: Logo | Şantiye Seçici | Global Arama | Görünüm (Kart / B2B Tablo) | Teklif İste (RFQ) | Sepet Drawer"]
        subgraph MainArea["Ana Çalışma Alanı (1440px Grid)"]
            SIDE["Sol Sabit Filtre & Kategori Paneli (280px)\n- Kategori Ağacı\n- Şehir / İlçe\n- Teslimat Tipi\n- Fiyat & Stok Filtresi"]
            GRID["Sağ İçerik Alanı (Esnek)\n- Mod 1: 3-4 Sütunlu B2B Ürün Kartları\n- Mod 2: Excel Tipi Hızlı Sipariş Tablosu (DataGrid)"]
        end
        TOP --> MainArea
    end

    subgraph SellerWeb["🏭 Satıcı & Admin Web ERP Konsolu (>= 1024px)"]
        direction LR
        SSIDE["Sol Sabit Koyu ERP Menüsü (260px #0B1220)\n- Kontrol Merkezi\n- Hızlı Stok/Fiyat Matrisi\n- Sipariş Kanban Tahtası\n- İhale / Teklif (RFQ) Havuzu\n- Finans & Mağaza Ayarları"]
        SMAIN["Sağ Geniş Operasyon Ekranı\n- 4'lü Bento KPI Kartları\n- Çok Sütunlu Tablo / Kanban\n- Sağdan Açılan Detay Drawer"]
        SSIDE --> SMAIN
    end
```

---

## BÖLÜM 5: Adım Adım Uygulama Planı (8 Fazlı Yol Haritası)

### FAZ 1: Veritabanı (Supabase SQL) Onarımı ve B2B Şema Yükseltmesi
**Hedef:** Mevcut SQL bug'larını düzeltmek ve B2B/App Store özelliklerinin veritabanı altyapısını tek bir idempotent migration dosyası ile kurmak.
* **Düzenlenecek / Eklenecek Dosyalar:**
  * [`database.sql`](file:///c:/Users/user/baret/database.sql) ve yeni [`docs/baret-v2-commercial-upgrade.sql`](file:///c:/Users/user/baret/docs/baret-v2-commercial-upgrade.sql)
  * [`src/types/database.ts`](file:///c:/Users/user/baret/src/types/database.ts)
* **Yapılacak İşlemler:**
  1. `protect_store_admin_columns()` fonksiyonuna `IF current_setting('baret.allow_license_update', true) = 'on' THEN RETURN NEW; END IF;` kontrolünün eklenmesi.
  2. `store_subscriptions` tablosuna abonelik eklendiğinde/uzatıldığında `stores.license_expires_at` sütununu otomatik senkronize eden trigger (`trg_sync_store_license_from_subscription`) yazılması.
  3. Abonelik modeline geçildiği için `trg_orders_create_commission` trigger'ının devre dışı bırakılması (veya `platform_settings.commission_rate = 0` varsayılanına çekilmesi).
  4. `products` tablosuna B2B sütunlarının eklenmesi:
     * `category TEXT` (Varsayılan kategorilerle senkron)
     * `unit TEXT NOT NULL DEFAULT 'adet'` (`adet`, `torba`, `palet`, `ton`, `kg`, `m2`, `metre`, `koli`)
     * `min_order_qty INTEGER NOT NULL DEFAULT 1`
     * `bulk_pricing JSONB DEFAULT '[]'::jsonb` (`[{ "min_qty": 10, "unit_price": 220 }, { "min_qty": 50, "unit_price": 195 }]`)
     * `sku TEXT`, `brand TEXT`, `vat_rate INTEGER DEFAULT 20`
  5. **B2B Teklif (RFQ) Tabloları:**
     * `public.rfq_requests` (Alıcının açtığı şantiye malzeme talebi: başlık, şehir, ilçe, şantiye adresi, termin tarihi, kalemler JSONB/tablo, durum `open | quoted | accepted | closed`).
     * `public.rfq_quotes` (Onaylı nalburların verdiği fiyat teklifleri: toplam tutar, kalem fiyatları, teslimat şartı, geçerlilik süresi, not, durum `pending | accepted | rejected`).
  6. **Şantiyelerim & Kurumsal Profil Alanları:**
     * `public.buyer_sites` (Şantiye adı, şehir, ilçe, açık adres, koordinat, şantiye şefi tel, lojistik notu).
     * `public.users` tablosuna `company_name`, `tax_office`, `tax_number` alanlarının eklenmesi.
  7. **Apple App Store Hesap Silme RPC'si (`public.delete_my_account()`):**
     * Aktif siparişi olmayan kullanıcının kişisel verilerini anonimleştirip `auth.users` ve `public.users` kaydını güvenli şekilde silen `SECURITY DEFINER` fonksiyonu.

---

### FAZ 2: Çapraz Platform (Web + iOS + Android) Çekirdek Altyapısı
**Hedef:** Web ve iOS'ta kırılan tüm native çağrıları izole etmek ve uygulama genelinde çalışan modern UI bileşenleri kurmak.
* **Eklenecek / Düzenlenecek Dosyalar:**
  * `src/components/ui/ConfirmModal.tsx` (Yeni — `Alert.alert` yerine Web, iOS ve Android'de kusursuz çalışan şık B2B onay/aksiyon modalı)
  * `src/components/ui/ToastNotice.tsx` (Yeni — "Sepete eklendi", "Kopyalandı" gibi bildirimler için üst/alt bildirim çubuğu)
  * `src/components/ui/DatePickerField.tsx` (Yeni — Web'de `<input type="date">`, iOS/Android'de `@react-native-community/datetimepicker` kullanan ortak bileşen)
  * [`src/services/storage.ts`](file:///c:/Users/user/baret/src/services/storage.ts) (Web'de `fetch(localUri).then(r => r.arrayBuffer())` desteği, mobilde `FileSystem` desteği)
  * [`src/utils/geo.ts`](file:///c:/Users/user/baret/src/utils/geo.ts) (Web'de `https://www.google.com/maps/dir/...` yeni sekme yönlendirmesi ve HTML5 Geolocation API uyumu)
  * [`src/services/supabase.ts`](file:///c:/Users/user/baret/src/services/supabase.ts) (Web'de `detectSessionInUrl: Platform.OS === 'web'` ve SSR güvenli storage)
  * [`src/services/orders.ts`](file:///c:/Users/user/baret/src/services/orders.ts) (Çift bildirim hatasının giderilmesi, toptan kademeli fiyat hesaplaması)

---

### FAZ 3: Misafir Modu (Guest Browsing), Web URL Routing ve Kimlik Doğrulama
**Hedef:** Hem Apple Guideline 5.1.1 uyumu hem de Web SEO/dönüşüm başarısı için zorunlu giriş duvarını kaldırmak.
* **Düzenlenecek Dosyalar:**
  * [`src/navigation/RootNavigator.tsx`](file:///c:/Users/user/baret/src/navigation/RootNavigator.tsx)
  * [`src/navigation/BuyerNavigator.tsx`](file:///c:/Users/user/baret/src/navigation/BuyerNavigator.tsx)
  * [`src/screens/auth/LoginScreen.tsx`](file:///c:/Users/user/baret/src/screens/auth/LoginScreen.tsx), [`RegisterScreen.tsx`](file:///c:/Users/user/baret/src/screens/auth/RegisterScreen.tsx), [`RoleSelectScreen.tsx`](file:///c:/Users/user/baret/src/screens/auth/RoleSelectScreen.tsx)
* **Yapılacak İşlemler:**
  1. Oturum açmamış (`!session`) kullanıcılar doğrudan **Alıcı Kataloğu (`BuyerNavigator`)** ile karşılaşacak.
  2. Web için React Navigation `linking` yapılandırması eklenecek (`/`, `/urun/:productId`, `/sepet`, `/teklif-iste`, `/siparislerim`, `/giris`, `/kayit`, `/satici`, `/admin`).
  3. Misafir kullanıcı Katalogda gezinebilecek, ürün detayını inceleyebilecek ve Sepete ürün ekleyebilecek.
  4. Misafir kullanıcı **Siparişe Geç**, **Teklif İste (RFQ)** veya **Profil** sekmesine tıkladığında; tek tıkla Giriş Yap / Alıcı Kaydı / Satıcı Kaydı ekranına yönlendirilecek ve giriş yaptıktan sonra sepeti korunarak kaldığı yerden devam edecek.
  5. Web'de Giriş ve Kayıt ekranları masaüstünde sol tarafta endüstriyel Baret değer önerisi vitrini, sağ tarafta form kartı olan **Split-Screen Kurumsal Giriş** tasarımına kavuşacak.

---

### FAZ 4: Kurumsal B2B Web Layout Shell & Adaptive Navigation
**Hedef:** Uygulama Web tarayıcısında açıldığında mobil tab bar yerine gerçek bir B2B Web Portalı deneyimi sunmak.
* **Eklenecek / Düzenlenecek Dosyalar:**
  * `src/hooks/useResponsiveLayout.ts` (Yeni — `isDesktop`, `isTablet`, `isMobile`, `width` kırılımları)
  * `src/components/layout/WebPortalHeader.tsx` (Yeni — Alıcı Web üst barı: Logo, Aktif Şantiye Seçici, Hızlı Arama, Katalog/B2B Tablo/Tekliflerim menüsü, Sepet Özeti, Hesap/Giriş butonu)
  * `src/components/layout/EnterpriseSidebarLayout.tsx` (Yeni — Satıcı ve Admin Web için koyu endüstriyel `#0B1220` sol menü + geniş çalışma alanı iskeleti)
  * `src/components/layout/ResponsiveContainer.tsx` (Yeni — İçeriği masaüstünde dengeli grid içinde tutan kapsayıcı)

---

### FAZ 5: Alıcı (Mühendis / Şantiye) Deneyiminin B2B Seviyesine Çıkarılması
**Hedef:** Alıcı tarafını hem mobilde hem Web'de birinci sınıf bir inşaat tedarik platformuna dönüştürmek.
* **Eklenecek / Düzenlenecek Dosyalar:**
  * [`src/screens/buyer/HomeScreen.tsx`](file:///c:/Users/user/baret/src/screens/buyer/HomeScreen.tsx)
  * `src/components/buyer/B2BQuickOrderTable.tsx` (Yeni — Web ve Tablet için Excel tarzı Hızlı Sipariş DataGrid görünümü)
  * [`src/components/buyer/CatalogProductCard.tsx`](file:///c:/Users/user/baret/src/components/buyer/CatalogProductCard.tsx)
  * [`src/screens/buyer/ProductDetailScreen.tsx`](file:///c:/Users/user/baret/src/screens/buyer/ProductDetailScreen.tsx)
  * `src/screens/buyer/RfqListScreen.tsx` & `src/screens/buyer/RfqCreateScreen.tsx` (Yeni — Şantiye İhale / Teklif İsteme modülü)
  * [`src/screens/buyer/CheckoutScreen.tsx`](file:///c:/Users/user/baret/src/screens/buyer/CheckoutScreen.tsx) & [`src/screens/buyer/OrdersScreen.tsx`](file:///c:/Users/user/baret/src/screens/buyer/OrdersScreen.tsx)
* **Yapılacak İşlemler:**
  1. **Çift Görünüm Modu (Kart Grid vs B2B Hızlı Sipariş Tablosu):**
     * Masaüstünde sol tarafta sabit filtre paneli, sağda 3-4 sütunlu ürün kartları veya **Hızlı Sipariş Tablosu (Tablo Görünümü)** seçimi.
     * Tablo görünümünde mühendis tek ekrandan ürünlerin birimini (`Torba`, `Palet`, `Ton`), toptan kademe fiyatını, mağazasını ve stok durumunu görüp satır yanındaki kutudan adet girerek anında sepete ekleyebilecek.
  2. **Ürün Detayda Toptan Fiyat Basamakları (Bulk Tier Table):**
     * Ürün detay sayfasında masaüstünde 2 sütunlu (Sol: Büyük Görsel + Mağaza Güvence Kartı, Sağ: Teknik Özellikler, Birim, Kademeli Fiyat Tablosu, KDV Dahil/Hariç Gösterim, Hızlı Adet Butonları `+10`, `+50`).
  3. **Şantiye Seçici & Kurumsal Checkout:**
     * Checkout ekranında kayıtlı şantiyelerden birini tek tıkla seçme, Fatura Tipi (*Bireysel / Kurumsal Fatura — Vergi Dairesi & VKN*) ve Ödeme Tercihi (*Havale/EFT, Teslimatta Kredi Kartı/Nakit, Cari Hesap Talebi*).
  4. **Sipariş Gruplama & Yazdırılabilir Sipariş Fişi:**
     * Aynı anda verilen sipariş satırlarının gruplanarak gösterilmesi ve Web'de **"Sipariş / İrsaliye Fişi Yazdır (PDF)"** butonu.

---

### FAZ 6: Satıcı (Nalbur / Tedarikçi) ERP Paneli ve Teklif Yanıtlama
**Hedef:** Nalburlara hem cepte hem de mağaza bilgisayarında (Web) kullanabilecekleri çok güçlü bir ticari panel sunmak.
* **Düzenlenecek / Eklenecek Dosyalar:**
  * [`src/screens/seller/SellerDashboardScreen.tsx`](file:///c:/Users/user/baret/src/screens/seller/SellerDashboardScreen.tsx)
  * [`src/screens/seller/ProductsListScreen.tsx`](file:///c:/Users/user/baret/src/screens/seller/ProductsListScreen.tsx) & [`src/screens/seller/ProductFormScreen.tsx`](file:///c:/Users/user/baret/src/screens/seller/ProductFormScreen.tsx)
  * [`src/screens/seller/SellerOrdersScreen.tsx`](file:///c:/Users/user/baret/src/screens/seller/SellerOrdersScreen.tsx)
  * `src/screens/seller/SellerRfqPoolScreen.tsx` (Yeni — Bölgedeki şantiyelerden gelen malzeme teklif taleplerini görme ve fiyat verme ekranı)
  * [`src/screens/seller/StoreSettingsScreen.tsx`](file:///c:/Users/user/baret/src/screens/seller/StoreSettingsScreen.tsx)
* **Yapılacak İşlemler:**
  1. **Zengin Ürün Formu:** Kategori seçici (`PRODUCT_CATEGORIES`), Birim seçici (`Adet`, `Torba`, `Palet`, `Ton`, `m²`, `Metre`), Marka/SKU ve **Toptan Kademeli Fiyat Ekleme** (`10+ alımda birim fiyat`, `50+ alımda birim fiyat`).
  2. **Web'de Toplu Stok & Fiyat Düzenleme (Inline Matrix):** Satıcı bilgisayarından girdiğinde ürünlerinin fiyatını ve stoğunu liste üzerinden tek tıkla güncelleyebilecek.
  3. **Sipariş Ekranı Temizliği & Kanban Görünümü:** Eski "%10 komisyon" kalıntılarının temizlenmesi; Web'de siparişlerin durum sütunlarıyla veya filtre sekmeleriyle hızlı işlenmesi.
  4. **İhale / Teklif Havuzu (`SellerRfqPoolScreen`):** Nalbur kendi şehrindeki mühendislerin açtığı malzeme listelerine fiyat teklifi verebilecek.

---

### FAZ 7: Admin "Baret Control Tower" Web & Mobil Geliştirmeleri
**Hedef:** Platform yöneticisinin (sizin) tüm ticari operasyonu tek ekrandan yönetmesi.
* **Düzenlenecek Dosyalar:**
  * [`src/screens/admin/AdminHomeScreen.tsx`](file:///c:/Users/user/baret/src/screens/admin/AdminHomeScreen.tsx)
  * [`src/screens/admin/AdminSubscriptionsScreen.tsx`](file:///c:/Users/user/baret/src/screens/admin/AdminSubscriptionsScreen.tsx)
  * [`src/screens/admin/LicenseKeysScreen.tsx`](file:///c:/Users/user/baret/src/screens/admin/LicenseKeysScreen.tsx)
  * [`src/services/plans.ts`](file:///c:/Users/user/baret/src/services/plans.ts)
* **Yapılacak İşlemler:**
  1. Admin bir mağazaya abonelik (`assignStoreSubscription`) atadığında mağazanın `license_expires_at` tarihinin de otomatik olarak paket bitiş tarihine güncellenmesi (böylece mağaza anında katalogda yayına girer).
  2. `LicenseKeysScreen` içindeki tarih seçicinin Web uyumlu `DatePickerField` ile değiştirilmesi ve Web'de tek tıkla panoya kopyalama (`Clipboard.setStringAsync`) desteği.
  3. Web'de Admin panelinin sol sabit menülü (`EnterpriseSidebarLayout`) geniş ekran komuta merkezi olarak çalışması ve CSV dışa aktarma (`Share.share`) işleminin Web'de doğrudan `.csv` dosyası indirmesi (`Blob` + `<a download>`).

---

### FAZ 8: iOS App Store Hazırlığı, Hesap Silme ve Web/Mobil Build Doğrulaması
**Hedef:** Sıfır TypeScript hatası, sıfır platform kırılması ile iOS (`eas build -p ios`), Android (`eas build -p android`) ve Web (`npx expo export -p web`) çıktılarının yayına hazır hale getirilmesi.
* **Düzenlenecek Dosyalar:**
  * [`app.json`](file:///c:/Users/user/baret/app.json)
  * [`src/screens/buyer/ProfileScreen.tsx`](file:///c:/Users/user/baret/src/screens/buyer/ProfileScreen.tsx) & [`src/screens/seller/StoreSettingsScreen.tsx`](file:///c:/Users/user/baret/src/screens/seller/StoreSettingsScreen.tsx)
  * [`landing/index.html`](file:///c:/Users/user/baret/landing/index.html) & [`landing/account-deletion.html`](file:///c:/Users/user/baret/landing/account-deletion.html)
* **Yapılacak İşlemler:**
  1. **iOS `app.json` İyileştirmeleri:**
     * `NSCameraUsageDescription` eklenecek ("Ürün ve irsaliye fotoğrafı çekmek için kamera erişimine izin verin.").
     * Web meta/title/bundler ayarları (`output: "single"`, PWA/Favicon/ThemeColor) yapılandırılacak.
  2. **Uygulama İçi Hesap Silme (Guideline 5.1.1(v)):**
     * Alıcı ve Satıcı profil/ayar ekranlarına `ConfirmModal` ile korunan **"Hesabımı Kalıcı Olarak Sil"** butonu eklenecek.
  3. **iOS Guideline 3.1.1 (IAP) Koruması:**
     * `Platform.OS === 'ios'` iken satıcı ekranındaki aylık TL fiyat etiketleri ve lisans anahtarı satın alma yönlendirmeleri kurumsal B2B görünümüne ("Kurumsal üyelik durumunuz aktif / Web portalından yönetilir") uyarlanacak.
  4. **Derleme & Tip Kontrolü:**
     * `npx tsc --noEmit` ve `npx expo export --platform web` ile tüm kod tabanının uçtan uca doğrulanması.
