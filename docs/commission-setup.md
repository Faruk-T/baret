# Platform komisyonu

Sipariş tutarı üzerinden admin’in belirlediği `%X` komisyon alınır; kalan tutar satıcının neti olarak kaydedilir.

## Kurulum

1. Supabase → **SQL Editor**
2. `docs/commission-setup.sql` çalıştır
3. Uygulamayı yenile

Varsayılan oran: **%8**.

## Davranış

| Olay | Sonuç |
|------|--------|
| Yeni sipariş | `order_commissions` satırı (oran o anki ayardan snapshot) |
| Sipariş iptal (`cancelled`) | Komisyon kaydı silinir |
| Oran değişince | Sadece **yeni** siparişler etkilenir |

## Uygulama

- **Admin → Komisyon:** oranı güncelle, toplam gelir özeti
- **Satıcı → Siparişler:** komisyon + net tutar satırları
