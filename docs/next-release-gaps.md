# Next release gaps (after Play v4)

Current store track: production **1.0.0 (versionCode 4)** — under review / first live build.
Do **not** upload a new AAB until that review finishes (or is rejected).
Ship the items below in **1.0.1+** (or 1.1.0) after go-live feedback.

## Already shipped in review build (v4)

- Seller subscription plans (Basic / Pro / Custom) instead of order commission
- Privacy + account-deletion landing pages
- Local notification channel + sound while app Realtime is connected
- Security hardening (price lock, license gate, pickup secrets, status machine)

## Play Console recommendations (code / binary)

| Gap | Why | Next step |
|-----|-----|-----------|
| Edge-to-edge | Android 15+ default; Console warns about deprecated bar APIs | Done on `day-24-edge-to-edge` — needs new AAB after review |
| Large screens / orientation | `orientation: "portrait"` restricts tablets & foldables | Allow default orientation or tablet landscape; smoke-test layouts |
| R8 / ProGuard mapping | Crash/ANR symbolication warning | Enable minify in production profile or upload mapping from EAS |
| Target SDK | Keep aligning with Play policy floor | Re-check on each Expo SDK bump |

## Product / monetization

| Gap | Why | Next step |
|-----|-----|-----------|
| Plan assignment UX | Admin assigns per store; no global “who is on which plan” list | Admin subscriptions table (store · plan · ends_at · usage) |
| Payment for plans | Plans are tracked in DB; money is offline | Invoice / bank transfer flow or iyzico later |
| Expired plan behavior | Product create blocked; catalog still license-based | Decide: soft-hide products vs keep visible read-only |
| Landing plan prices | Static HTML; admin can change DB seeds | Sync landing from live `seller_plans` or document “edit HTML after price change” |

## Notifications

| Gap | Why | Next step |
|-----|-----|-----------|
| Closed-app push (FCM) | Tray alerts only while app/Realtime connected | Expo push + FCM credentials + store device tokens |
| Buyer push | Mostly seller/admin inbox today | Order status → buyer push |
| Notification sound asset | Uses system default | Optional branded `.wav` via `expo-notifications` sounds |

## Ops / admin

| Gap | Why | Next step |
|-----|-----|-----------|
| Strict `admin_role` | Roles UI mostly cosmetic | Enforce role checks in RLS / RPCs |
| Finance KPIs | Still show archived commission metrics | Replace with subscription MRR / active plans |
| Audit trail for plan changes | Assign works; audit optional | Log plan assign/renew in `admin_audit_logs` |

## Quality / store

| Gap | Why | Next step |
|-----|-----|-----------|
| Production opt-in testers | Personal accounts need ~12 opted-in for 14 days before production access (if policy applies) | Keep closed-test cohort alive; track opt-ins |
| Screenshots / feature graphic | Store listing assets | Refresh after UI polish |
| Mapping / crash reporting | No Sentry yet | Optional Sentry + R8 mapping |
| iOS | Android-first | Apple Developer + EAS iOS when ready |

## Suggested 1.0.1 scope (minimal)

1. Edge-to-edge AAB (this branch)
2. Admin “active subscriptions” list
3. Confirm seller-plans SQL + seed prices on production Supabase
4. Quiet Play warnings that block nothing (mapping optional)

## Suggested 1.1.0 scope

1. FCM / Expo push
2. Plan payment tracking
3. Tablet / large-screen pass
4. Finance dashboard without commission archive noise
