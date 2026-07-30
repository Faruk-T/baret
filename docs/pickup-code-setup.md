# Teslim doğrulama kodu

Mağazadan teslim / kapıda teslim için kısa kod. Alıcı kodu gösterir; satıcı uygulamada okutunca (yazar) sipariş **Teslim Edildi** olur.

## Kurulum

Supabase → SQL Editor → `docs/pickup-code-setup.sql`

## Akış

```
Beklemede → Hazırlanıyor (satıcı kabul)
         → Hazır / Yolda (shipped)  → 6 haneli kod üretilir
         → Satıcı kodu doğrular     → Teslim edildi
```

| Rol | Ne görür |
|-----|----------|
| Alıcı | `shipped` iken büyük teslim kodu |
| Satıcı | Kod girişi → doğrula |

Barcode/QR okutma sonraki fazda eklenebilir; MVP’de manuel 6 karakter yeterlidir.
