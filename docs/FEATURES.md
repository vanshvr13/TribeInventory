# Tribe Inventory — Features

## Dashboard (landing view)
- **Inventory Summary**: total items, total folders, total inventory value (compact, e.g. "6.8K RON").
- **Items that need restocking**: horizontal card carousel of items below min level; "OUT OF STOCK" badge at quantity 0; "View all N items" jumps to the Shopping list.
- **Recent Items**: newest items by `createdAt`, click to open/edit.
- **Recent Activity**: last 6 activity entries with friendly timestamps; "View all activity" jumps to the Activity view.

## Folders & items
- Nested folders (tree in sidebar). Items must belong to a folder — saving is blocked otherwise; a folder can be created inline from the item form.
- Item fields: name, brand, provider (who you buy from), quantity + unit, min level, price/unit, expiry date, up to 8 photos.
- Deleting a folder cascades to subfolders, their items, and their photos, after an explicit confirmation showing the counts.

## AI identify (Gemini via Firebase AI Logic)
- Model: `gemini-3.5-flash-lite` on the Agent Platform backend (GCP billing).
- First photo = product; optional second photo = expiry close-up (parsed to ISO date only when the model is confident).
- **Generic naming rule**: everyday goods get the plain product type + size ("Water 2L", not "Aqua Carpatica"); the brand goes to the brand field. Distinctive names are kept only when the generic name would lose information (e.g. "Coca-Cola Zero 1.5L").
- **Style matching**: up to 12 existing item names are sent as examples, so new suggestions follow how you already name things — this is how the AI "learns" your naming over time without any training.
- Naming language follows the app's language setting.
- Folder suggestion is constrained (enum) to your existing folder paths; the model must answer `__NONE__` rather than guess.

## Stock reasons & activity feed
- Changing an item's quantity requires picking a reason: Restock / Inventory count / Consumed / Returned. Save is disabled until one is chosen.
- Every change writes an activity entry attributed to the signed-in user: quantity changes ("X increased quantity of Coffee beans by 1 kg to 3 kg"), field edits ("X updated Price, Min level of …"), item created, item deleted.
- Activity view: entries newest-first with friendly timestamps (time today, "Yesterday, 20:29", date otherwise) + monthly Consumed/Restocked totals. These metrics rely on honest manual logging.

## Shopping list & export
- Auto-built from items with `quantity < minLevel`, sorted by provider; deficit = "top up to min level".
- Export as CSV (headers in the current language); uses the native share sheet on mobile when available, otherwise downloads.

## Search & sort
- Search box in item views matches name, brand, and provider. In folder views a non-empty search looks across **all** folders (the folder name is shown on each result); in Expiring/Shopping it filters within that list.
- Sort: Name (A–Z), Quantity, Recently updated, Oldest updated.

## Expiry tracking
- Status derived from the expiry date: expired (red), ≤7 days (amber), ok. Sidebar "Expiring / Expired" aggregates across all folders with a count badge.

## Settings
- **Language**: English / Romanian — every UI string, activity sentence, and CSV header.
- **Currency**: RON / USD / INR — display formatting only, prices are not converted.
- Both persist per-device in localStorage.

## Security
- Email/password Firebase Auth (single household account); Firestore + Storage rules require a signed-in user.
- App Check with reCAPTCHA Enterprise gates the AI calls; a debug token covers local dev.

## Timestamps
- `createdAt` / `updatedAt` on every item, shown in the edit modal ("Added … · Last updated …") and driving Recent Items + the updated-sort.
