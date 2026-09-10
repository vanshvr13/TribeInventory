# Tribe Inventory — Roadmap

Deferred on purpose, roughly in priority order:

1. **Notifications** (expiry approaching, low stock) — explicitly postponed until the household has used the app for a while. Likely shape: FCM web push + a small scheduled Cloud Function that scans for expiring / below-min items daily.
2. **Realtime sync** — data currently loads once per session (`getDocs`); switch to `onSnapshot` listeners if two people ever use it at the same time.
3. **Activity entries for folder deletes** — cascading deletes currently don't write per-item "deleted" logs (to avoid flooding the feed). Revisit if the history gap matters.
4. **Multi-user accounts / roles** — today it's one shared household login; per-person logins would make activity attribution richer (currently attribution = email prefix).
5. **Currency conversion** — the currency setting is display-only. Real conversion needs an exchange-rate source and a stored base currency per price.
6. **Log retention** — `stockLogs` grows forever; add archiving/pruning if it gets slow to load.
7. **Barcode scanning** — deliberately rejected (vision model covers it); keep it rejected unless the AI misidentifies too often.
8. **Code-splitting** — the JS bundle is ~1MB minified (Firebase SDK dominates); lazy-load the AI module if load time becomes noticeable.
