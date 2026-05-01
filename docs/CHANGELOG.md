# KONCOPOS — Changelog

## v3.1.0 — Modular Backend (2026-05-01)

### Backend Modularization (Major)

Split monolithic `Code.gs` (988 lines, 1 file) into 9 modular `.gs` files (918 lines total).

| File | Purpose | Lines |
|------|---------|-------|
| `Config.gs` | Global constants, sheet mappings, schemas, rate limits | 77 |
| `Helpers.gs` | Utilities + 5 new shared helpers | 79 |
| `Security.gs` | Rate limiting, CSRF tokens, origin validation | 77 |
| `Database.gs` | Sheet setup, schema migration, named-master helpers | 90 |
| `Auth.gs` | Registration, login, logout, sessions, password | 117 |
| `Crud.gs` | CRUD operations, bulk sync | 103 |
| `Sync.gs` | pushAll, pullAll bulk data transfer | 79 |
| `Reports.gs` | 11 server-side report generators | 223 |
| `Api.gs` | HTTP entry points (`doGet`, `doPost`), menu | 73 |

### Performance Improvements

- **4.4× faster report generation**: `generateAllLaporan()` now fetches source data once (5 reads) and passes to all 11 generators. Previously each generator fetched independently (up to 22 reads total).
- **`updateRow` reduced to 1 API call**: Replaced N individual `sh.getRange().setValue()` calls per column with single `sh.getRange().setValues([row])`.
- **`CacheService` reused at module level**: Stored as `CACHE` variable instead of calling `CacheService.getScriptCache()` on every security check.

### Bug Fixes

- **`addLog` truncation**: Now uses `while` loop to delete all excess rows when log exceeds 1001, instead of deleting only 1.
- **`ensureSheetSchema_` column insertion**: Fixed column being inserted at `Math.max(i, lastColumn)` (wrong position) when it should be inserted at position `i`.

### New Shared Helpers

- `_nowISO()` — Centralized `new Date().toISOString()` (replaces 20+ occurrences)
- `_rowToObject(headers, rowValues, sheetKey)` — Row-to-object conversion (replaces 6 duplicate loops)
- `_findRowIndexById(sh, id, uid)` — ID lookup with ownership check (replaces 3 duplicate patterns)
- `_parseItemsField(rawItems)` — Safe JSON items parser (replaces 3 duplicate patterns)
- `_writeReportRows(sh, headers, rows)` — Report write boilerplate (replaces 11× duplicate code)

### Deduplication

- Removed ~110 lines of duplicated report writer boilerplate
- Removed ~20 lines of duplicated row-to-object loops
- Removed ~15 lines of duplicated ID-find loops
- `pushAll` outlet sync now uses `delUserRows()` instead of inline duplicate code

### Documentation

- Added `docs/ARCHITECTURE.md` — System architecture, data flow, tech stack, routing, design principles
- Added `docs/FRONTEND.md` — All 12 JS modules, 52 pages, UI design system, routing, state management
- Added `docs/BACKEND.md` — All 9 GAS modules, API endpoints, schema reference, auth flow, security, deployment
- Added `docs/CHANGELOG.md` — This file

### Backward Compatibility

All API endpoints unchanged. All function signatures preserved. Existing deployments can replace `Code.gs` with the 9 new files without any client-side changes.

---

## v3.0.0 — Initial Release (Base)

### Core Features

- **Point of Sale** with cart, checkout, receipt
- **14 report types** with PDF/Excel export
- **Expense management** with profit/loss tracking
- **Purchase management** with supplier debt tracking
- **Product management** with variants, wholesale tiers, camera, barcode
- **Contact management**: Pelanggan, Supplier, Sales, Kurir, Kasir
- **Dashboard** with 7-day sales chart (Chart.js)
- **Bluetooth thermal printer** support (ESC/POS)
- **Offline-first** with localStorage + auto-sync to Google Sheets
- **Multi-user** with user isolation via `userId` scoping

### Authentication

- Token-based sessions (30-day expiry)
- Rate limiting: login, register, API (per IP + per token)
- CSRF protection for login/register

### Backend (GAS — Monolithic)

- **1 file**: `Code.gs` (988 lines)
- 24 Google Sheets tables with schema definitions
- Full CRUD with ownership scoping
- 11 server-side report generators
- bulkSync, pushAll, pullAll for offline sync
- Named master data patterns (auto-ID generation)
- Sync Log with auto-truncation
- Google Sheets custom menu

### Frontend

- Pure vanilla JS (no framework)
- Hash-based SPA router with 52 page fragments
- localStorage state management
- CDN libraries: Chart.js, jsPDF, Font Awesome
- Mobile-first CSS design system (4679 lines)
- PWA: manifest.json, service worker, icons

### Known Limitations

- Password hashing uses simple XOR + base64 (not production-grade)
- No real-time multi-user conflict resolution
- Google Sheets API quotas apply (especially for large datasets)
- No server-side email verification or password reset flow
