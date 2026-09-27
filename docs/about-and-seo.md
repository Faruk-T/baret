# About / Credits / SEO

## Uygulama

Profil (alıcı), Mağaza ayarları (satıcı) ve Admin ana menüden **Hakkında**:

- Credits: Faruk Tazeoğlu, Ümit Tunç, Trunçgil Teknoloji
- Lisanslar (OSS)
- Bize ulaşın → Truncgil, landing, Play, gizlilik, hesap silme

Landing URL: `EXPO_PUBLIC_LANDING_URL` (yoksa `https://landing-ten-pi-68.vercel.app`).

## Landing SEO

- Open Graph + canonical
- JSON-LD (`Organization`, `MobileApplication`, `WebSite`)
- `robots.txt`, `sitemap.xml`, `llms.txt` (GEO / LLM keşfi)
- `site.json` — URL sabitleri; Truncgil `baret.truncgil.com` bağlanınca güncelle

## Domain geçişi

1. DNS: `baret.truncgil.com` → Vercel (Truncgil)
2. `landing/site.json`, `robots.txt`, `sitemap.xml`, `llms.txt`, HTML canonical/og URL’leri
3. `.env` / `.env.example` → `EXPO_PUBLIC_LANDING_URL=https://baret.truncgil.com`
4. Staj blog / Play “web sitesi” alanları
