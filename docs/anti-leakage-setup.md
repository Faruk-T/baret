# Platform sızıntısı önlemleri (disintermediation)

Satıcıların telefon / WhatsApp vererek komisyonu baypas etmesini azaltır. %100 engellenmez; maliyeti yükseltir.

## Kurulum

1. Önce `docs/commission-setup.sql` (yoksa)
2. Sonra `docs/anti-leakage-setup.sql`

## Ne yapıyor?

| Katman | Davranış |
|--------|----------|
| Katalog / ürün detay | Telefon, e-posta, tam adres yok; harita yok (sadece yaklaşık mesafe) |
| Sipariş sonrası | Satıcı `preparing+` yapınca alıcıya iletişim + harita açılır (RPC) |
| Yorumlar | Telefon / WhatsApp / e-posta metinden `[gizlendi]` |
| Şikayet | Alıcı raporlar → Admin şikayetler ekranı |
| Komisyon teşviki | İlk N sipariş düşük oran; yüksek puana indirim |

## Demo cümlesi

> İletişim bilgileri sipariş kabulünden önce kapalı; değer sipariş–takip–güven içinde tutuluyor. Kaçak için şikayet kanalı ve kademeli komisyon teşviki var.
