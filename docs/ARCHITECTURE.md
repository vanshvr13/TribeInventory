# Tribe Inventory — Architecture

Household inventory app. React 18 + Vite + Tailwind on the front, Firebase (Firestore, Storage, Auth, AI Logic, App Check) on the back. Deployed to Netlify via GitHub push (`main` → auto-deploy).

## File map

```
src/
  main.jsx               Entry point (StrictMode wrapper)
  App.jsx                Container: auth gate, all data state + Firestore ops, layout shell, routing between views
  firebaseClient.js      Firebase init: app, App Check, Firestore (db id "tribe-inventory"), Storage, Auth, AI
  gemini.js              identifyItemFromPhotos() — vision model call, prompt, response schema
  photoStorage.js        resizePhoto(), uploadPhoto(), deletePhoto()
  lib/
    format.js            Pure helpers: units, reasons, number/date/expiry formatting, CSV cells
    i18n.jsx             SettingsProvider (language + currency, persisted in localStorage), t(), money formatting
  components/
    Sidebar.jsx          Nav (Dashboard/All folders/Expiring/Shopping/Activity), folder tree, settings/sign-out
    Dashboard.jsx        Summary cards, restock carousel, recent items, recent activity
    ItemsView.jsx        Search + sort + stats header, item grid, shopping-list rows (owns its own search/sort state)
    ActivityView.jsx     Monthly stats + full activity feed; exports ActivityLine (shared with Dashboard)
    ItemModal.jsx        Add/edit item form, photo picker + camera, AI identify, inline folder create
    modals.jsx           FolderModal, DeleteFolderModal, SettingsModal
    LoginScreen.jsx      Email/password sign-in
    ui.jsx               Shared Modal/Field components + button/input class constants
docs/                    This documentation
firestore.rules          allow read/write if signed in
storage.rules            allow read/write if signed in
```

## Conventions

- **State lives in `App.jsx`**; components are presentational and receive data + callbacks. Exception: `ItemsView` owns search/sort/filter state locally (it resets per view via a React `key`).
- **All user-visible strings** go through `t("key")` from `lib/i18n.jsx`. Add every new string to BOTH the `en` and `ro` dictionaries. Stored values (units, stock reasons) stay in English in Firestore; only their display is translated (`t("unit.kg")`, `t("reason.Consumed")`).
- **Money** is a plain number in Firestore with no currency attached. The currency setting only changes display formatting (`fmtMoney`) — no conversion.
- **Local state mirrors `itemFromDoc` shape** (empty strings, not nulls). Firestore writes use nulls for empty optional fields. When adding an item field, update: `itemFromDoc`, `buildEmptyForm`, `openEditModal`, `handleSaveItem` fields object, `diffFields`, and the modal form.

## Data model (Firestore, database id `tribe-inventory`)

**folders**: `{ name, parentId: string|null }` — tree via parentId. Deleting cascades manually (no FK in Firestore): descendants + their items + their photos.

**items**: `{ name, quantity: number, unit, minLevel: number|null, price: number, brand: string|null, provider: string|null, expiry: "YYYY-MM-DD"|null, photos: string[] (Storage URLs), folderId, createdAt: ISO, updatedAt: ISO }`

**stockLogs** (the activity feed): every entry has `{ type, itemId, itemName, user (email), timestamp: ISO }` plus per-type fields:
- `type: "quantity"` — `previousQuantity, newQuantity, delta, reason, unit` (reason required in UI when quantity changes)
- `type: "updated"` — `changedFields: string[]` (keys like `price`, `minLevel`, `folder`, `photos`)
- `type: "created"` / `"deleted"` — no extra fields
- Legacy entries (pre-refactor) have no `type`/`user`; `logFromDoc` defaults them to `type: "quantity"`, `user: ""`.

## Photo pipeline (and why saving is fast)

1. On add (file pick or camera), the raw image is resized client-side to ≤1024px JPEG q0.85 (`resizePhoto`) — this is the stored/display copy.
2. **Upload starts immediately in the background** (`pendingUploads` map: dataURL → upload promise). By the time the user hits Save, uploads are usually done — Save just awaits already-resolved promises. Failed uploads retry once at save time.
3. Cancelling the modal (or removing a photo before saving) deletes the now-orphaned uploads from Storage, best-effort.
4. For the AI call only, photos are re-compressed to ≤768px q0.6 — 768px fits one Gemini tile (258 tokens flat), so smaller files cost the same tokens but upload faster.

Save itself is 2 round trips: one item write, then all activity-log writes in parallel.

## Views

Single `view` state object: `{kind: "dashboard"}` | `{kind: "folder", folderId: string|null}` (null = all folders) | `{kind: "expiring"}` | `{kind: "shopping"}` | `{kind: "activity"}`. Layout is full-viewport (`h-screen flex`) — the window never resizes between tabs; content scrolls inside the main pane.

## Gotchas learned the hard way

- Vite bakes `VITE_*` env vars at **build** time — new env vars need a Netlify "Clear cache and deploy".
- Firestore database id is `"tribe-inventory"`, not `(default)` — `getFirestore(app, "tribe-inventory")`.
- Firestore rejects `undefined` field values — always coalesce to `null`.
- Gemini Developer API billing is separate prepay; we use `AgentPlatformBackend` (standard GCP billing, covered by the $300 credit).
- React StrictMode double-renders in dev can show duplicate-key warnings that don't exist in production builds.
- `.env` is gitignored and must never be committed; Netlify needs the 6 `VITE_FIREBASE_*` vars + `VITE_RECAPTCHA_SITE_KEY`.
