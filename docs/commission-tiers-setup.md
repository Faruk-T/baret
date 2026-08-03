# Komisyon dilimleri (tutar bazlı)

Tek düz oran yerine sipariş **satır tutarına** göre dilim uygulanır. Sepetteki her ürün ayrı sipariş satırı olduğu için ucuz çivi ile pahalı çimento farklı oran alır.

## Kurulum

Supabase → SQL Editor → `docs/commission-tiers-setup.sql`

## Varsayılan dilimler

| Dilim | Tutar aralığı | Oran |
|-------|----------------|------|
| Küçük | &lt; 100 ₺ | %10 |
| Orta | 100 – 999,99 ₺ | %8 |
| Büyük | ≥ 1000 ₺ | %5 |

Ayrıca **minimum komisyon** (varsayılan 1 ₺): çok ucuz satırda platform payı sıfırlanmaz.

Teşvikler (önceki anti-leakage):

- İlk N siparişte daha düşük tavan oran
- Yüksek puana puan indirimi

## Admin

Admin → Komisyon ekranından dilimleri, minimumu ve teşvikleri düzenle. Örnek hesaplayıcı canlı önizleme verir.
