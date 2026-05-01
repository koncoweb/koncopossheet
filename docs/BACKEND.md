# KONCOPOS — Backend (Google Apps Script)

## Overview

The backend is a Google Apps Script (GAS) project deployed as a Web App. It exposes a JSON API via `doGet()` and `doPost()` and uses Google Sheets as its database — 24 sheets representing 24 logical "tables".

**Deployment folder**: `stitch/gas/`  
**Total files**: 9 `.gs` files (918 lines total)  
**Runtime**: Google Apps Script (V8)

---

## File Map

| File | Lines | Purpose |
|------|-------|---------|
| `Config.gs` | 77 | Global constants: sheet mappings, schemas, rate limits, origins |
| `Helpers.gs` | 79 | Utility functions + 5 shared helper abstractions |
| `Security.gs` | 77 | Rate limiting, CSRF tokens, origin validation |
| `Database.gs` | 90 | Sheet setup, schema migration, named-master helpers |
| `Auth.gs` | 117 | Registration, login, logout, sessions, password |
| `Crud.gs` | 103 | CRUD operations, bulk sync |
| `Sync.gs` | 79 | pushAll, pullAll bulk data transfer |
| `Reports.gs` | 223 | 11 server-side report generators |
| `Api.gs` | 73 | HTTP entry points (`doGet`, `doPost`) + Google Sheets menu |

---

## Module: `Config.gs` — Global Configuration

### Sheet Name Mappings (`SHEETS`, line 4-20)

Maps logical names to physical sheet names. All 32 keys:

| Key | Sheet Name |
|-----|-----------|
| `users` | Users |
| `sessions` | Sessions |
| `produk` | Produk |
| `kategori` | Kategori Produk |
| `pelanggan` | Pelanggan |
| `supplier` | Supplier |
| `sales` | Sales |
| `kurir` | Kurir |
| `kasir` | Kasir |
| `jenisPenjualan` | Jenis Penjualan |
| `metodePembayaran` | Metode Pembayaran |
| `kategoriBiaya` | Kategori Biaya |
| `transaksi` | Transaksi |
| `transaksiItems` | Transaksi Items |
| `pembelian` | Pembelian |
| `mutasi` | Mutasi Stok |
| `biaya` | Biaya |
| `laporanPenjualan` | Laporan Penjualan |
| `laporanPembelian` | Laporan Pembelian |
| `laporanStok` | Laporan Stok |
| `laporanLabaRugi` | Laporan Laba Rugi |
| `laporanArusKas` | Laporan Arus Kas |
| `laporanPiutang` | Laporan Piutang |
| `laporanHutang` | Laporan Hutang |
| `laporanOmsetSales` | Laporan Omset Sales |
| `laporanInvoicePelanggan` | Laporan Invoice Pelanggan |
| `laporanInvoiceSupplier` | Laporan Invoice Supplier |
| `laporanJatuhTempo` | Laporan Jatuh Tempo |
| `outlet` | Outlet |
| `settings` | Settings |
| `syncLog` | Sync Log |

### Schema Definitions (`SCHEMAS`, line 22-54)

Array of column headers for each sheet. Example — Transaksi:

```javascript
'Transaksi': [
  'id','userId','tanggal','tglJthTempo','pelangganId','pelanggan',
  'noMeja','jenisPenjualan','salesId','sales','items','total',
  'metodePembayaran','catatan','bayar','kembalian','lunas','isDraft',
  'createdAt','updatedAt'
]
```

### JSON Fields (`JSON_FIELDS`, line 56-60)

Fields stored as JSON strings in cells, parsed on read:
- `produk.varians`, `produk.grosirs` — variant/wholesale arrays
- `kasir.permissions` — permission object
- `transaksi.items` — line items array

### Named Master Config (`NAMED_MASTER_CONFIG`, line 62-66)

Master data types with auto-ID generation from name:

| Sheet Key | Prefix | Example |
|-----------|--------|---------|
| `kategori` | `kat` | `kat_makanan` |
| `metodePembayaran` | `mp` | `mp_tunai` |
| `jenisPenjualan` | `jp` | `jp_reguler` |
| `kategoriBiaya` | `kb` | `kb_operasional` |

### Rate Limit Config (`RATE_CONFIG`, line 72-78)

```javascript
LOGIN_PER_EMAIL:    { max: 5,   windowSec: 900  }   // 5 per 15 min per email
LOGIN_PER_IP:       { max: 15,  windowSec: 900  }   // 15 per 15 min per IP
REGISTER_PER_IP:    { max: 3,   windowSec: 3600 }   // 3 per hour per IP
API_PER_TOKEN:      { max: 120, windowSec: 60   }   // 120 per min per token
API_PER_IP:         { max: 200, windowSec: 60   }   // 200 per min per IP
CSRF_WINDOW_SEC:    3600                              // CSRF token TTL
```

---

## Module: `Helpers.gs` — Utilities

### Shared Utility Functions

| Function | Purpose |
|----------|---------|
| `getSheet(key)` | Lookup sheet by logical name, throw error if missing |
| `getHeaders(sh)` | Read first row as array |
| `encodeSheetValue_(sheetKey, field, value)` | JSON-serialize fields marked in JSON_FIELDS |
| `decodeSheetValue_(sheetKey, field, value)` | JSON-deserialize + boolean coercion for isDraft/lunas |
| `deleteTransaksiItemsByTransaksiId_(id, uid)` | Cascade-delete transaction line items |
| `genId()` | Generate unique ID: `gs_{timestamp}_{random}` |
| `genToken()` | Generate URL-safe base64 session token (64 chars) |
| `trim(s)` | String trim utility |
| `addLog(uid, aksi, sheet, jml, status, pesan)` | Append to Sync Log (keeps last 1000 rows) |
| `doPing()` | Health-check endpoint → `{status, time, sheet, version}` |
| `respond(data)` | JSON response wrapper for ContentService |
| `normalizeName_(value)` | Lowercase-trim for name matching |
| `slugifyName_(value)` | Lowercase-trim + slugify for ID generation |

### New Shared Helpers (introduced during modularization)

| Helper | Description |
|--------|-------------|
| `_nowISO()` | `new Date().toISOString()` centralized (used 20+ times) |
| `_rowToObject(headers, rowValues, sheetKey)` | Convert sheet row array → decoded object. Replaces 6 duplicate loops |
| `_findRowIndexById(sh, id, uid)` | Find row index by ID with ownership check. Returns `{rowIdx, headers, data}` or `{rowIdx:-1, error}`. Replaces 3 duplicate loops |
| `_parseItemsField(rawItems)` | Safe JSON items parser. Handles array, string, null |
| `_writeReportRows(sh, headers, rows)` | Write rows to report sheet (single `setValues` call). Replaces 11× duplicate boilerplate |

---

## Module: `Security.gs` — Rate Limiting & CSRF

### Allowed Origins

```javascript
ALLOWED_ORIGINS = [
  'https://koncopos.vercel.app',
  'https://koncopos.netlify.app',
  'https://localhost',
  'http://localhost'
]
```

### Rate Limiting

```javascript
_checkRateLimit(prefix, identifier, cfg)
```

Uses `CacheService.getScriptCache()` (stored as module-level `CACHE` variable for reuse).

**Algorithm**:
1. Compute cache key: `ratelimit_{prefix}_{identifier}`
2. Get stored timestamps from cache
3. Filter to within window, count
4. If ≥ max → return `{blocked: true, retryAfter: seconds}`
5. Else → add timestamp, update cache, return `null`

```javascript
_recordAttempt(prefix, identifier, windowSec)
```

Records an attempt without checking limit (used for login success tracking).

### CSRF Tokens

```javascript
_generateCsrfToken()   // SHA-256-based 32-char token with 'csrf_' prefix
_validateCsrfToken(t)  // Lookup in cache, consume (one-time use)
```

Required for `login` and `register` POST actions.

### Security Wrappers

```javascript
_securityCheckPost(e, body)  // IP rate limit + CSRF for login/register
_securityCheckGet(e, token, uid)  // Token-based rate limit
```

---

## Module: `Database.gs` — Setup & Schema

### `setupDatabase()` (line 1)

Creates all 24 sheets from SCHEMAS if they don't exist:
- Sets headers, formatting (pink for regular, dark for auth, navy for reports)
- Freezes header rows
- Shows UI alert on completion

### `ensureSheetSchema_(sh, expectedHeaders)` (line 25)

Schema migration: adds missing columns to existing sheets.

**Fixed bug**: Previously used `Math.max(i, sh.getLastColumn())` which inserted columns at wrong position. Now correctly uses `insertColumnBefore(1)` for position 0 and `insertColumnAfter(i)` for other positions.

### Named Master Helpers

```javascript
getNamedMasterConfig_(sheetKey)          // Lookup NAMED_MASTER_CONFIG
prepareNamedMasterData_(sheetKey, data)  // Auto-generate 'id' from 'nama' using prefix
findExistingNamedMasterRow_(sheetKey, nama, uid)  // Find existing master row by normalized name
dedupeNamedMasterRows_(sheetKey, rows)   // Deduplicate incoming rows by normalized name
```

---

## Module: `Auth.gs` — Authentication

### Password "Hashing"

```javascript
hashPw(pw)   // XOR with salt 'KONCOWRB2026', then base64
checkPw(pw, hashed)  // Compare hashed values
```

### Registration Flow (`doRegister`, line 1)

```
1. Validate email, password (min 6), nama, usaha, jenis
2. Check duplicate email in Users sheet
3. Create user: genId(), hashPw(), role='owner', status='active'
4. Append row to Users sheet
5. Create session (30-day token)
6. Setup default data: 4 categories, 4 payment methods, outlet
7. Log to Sync Log
8. Return {token, user(safe), message}
```

### Login Flow (`doLogin`, line 28)

```
1. Find user by email (case-insensitive)
2. Check inactive status
3. Verify password
4. Update lastLogin
5. Create session
6. Return {token, user(safe), message}
```

### Default Data (`setupDefaultData`, line 108)

Created for every new user:

| Sheet | Default Records |
|-------|----------------|
| Kategori | Makanan, Minuman, Snack, Lainnya |
| Metode Pembayaran | Tunai, Transfer, QRIS, Piutang |
| Outlet | nama, jenisUsaha, catatan ("Terima kasih!") |

### Session Management

```javascript
validateToken(token)  // Look up in Sessions, check expiry, return user or null
createSession(uid, email, usaha)  // Generate token, append to Sessions (30-day expiry)
getUserById(uid)     // Direct sheet lookup
safeUser(u)          // Strip password from user object
```

### Other

```javascript
doLogout(token)       // Delete session row
updateProfile(uid, data)  // Update allowed fields (namaLengkap, namaUsaha, jenisUsaha, telp, email, password)
```

---

## Module: `Crud.gs` — CRUD Operations

### Read

```javascript
readAllUser(sheetKey, uid)  // Read all rows for a user, returns {rows[], count}
readOne(sheetKey, id, uid)  // Read single row by ID with ownership check
```

Both use `_rowToObject()` to decode sheet values (including JSON fields, boolean coercion).

### Write

```javascript
createRow(sheetKey, data, uid)  // Insert new row (or upsert for named masters)
updateRow(sheetKey, id, data, uid)  // Update existing row (single setValues call)
deleteRow(sheetKey, id, uid)  // Delete row (cascades to transaksiItems if needed)
upsertRow(sheetKey, data, uid)  // Insert if not found, update if exists
```

**`createRow` flow**:
1. Prepare named master data (auto-generate ID from name)
2. Check for existing by name → upsert
3. Generate ID if missing
4. Set timestamps (createdAt, updatedAt)
5. Set userId for ownership
6. Append row

**`updateRow` optimization**: Uses single `sh.getRange(...).setValues([rowValues])` instead of N individual `setValue()` calls. Builds complete row array once, writes once.

### Bulk Sync

```javascript
bulkSyncUser(sheetKey, rows, uid)
```

Full replace: deletes all user rows, then writes new rows. Used by `pushAll` for each sheet type.

---

## Module: `Sync.gs` — Bulk Data Transfer

### `pushAll(data, uid)` (line 1)

Client pushes all local data to server:

```
1. For each sheet type (produk, kategori, transaksi, ...):
   → bulkSyncUser(sheet, data[sheet], uid)  // Full replace
2. If data.transaksi:
   → Decompose items[] into transaksiItems rows
   → bulkSyncUser('transaksiItems', items, uid)
3. If data.outlet:
   → Delete all user outlet rows
   → Write key-value pairs
4. generateAllLaporan(uid)  // Rebuild all reports
5. Log to Sync Log
```

### `pullAll(uid)` (line 53)

Server reads all user data and returns as JSON:

```
1. For each sheet type:
   → readAllUser(sheet, uid).rows
2. outlet → convert rows to key-value object
3. Return {status, data: {produk, kategori, transaksi, ...}, syncTime}
```

---

## Module: `Reports.gs` — Report Generation

### Orchestrator

```javascript
generateAllLaporan(uid)
```

**Performance optimization**: Fetches `transaksi`, `pembelian`, `biaya`, `mutasi`, `produk` **once** (5 reads) and passes them to all 11 generators. Previously each generator fetched independently (7× reads of transaksi alone).

### Shared Helper

```javascript
delUserRows(sh, uid)
```

Deletes all rows for a given userId from a sheet. Used as the first step in every report generator.

### Report Generators (11 functions)

| Function | Parameters | Source Data | Output |
|----------|-----------|-------------|--------|
| `genLapPenjualan(uid, trx)` | User ID, transactions | transaksi (non-draft) | Sales per invoice |
| `genLapPembelian(uid, beli)` | User ID, purchases | pembelian | Purchases per item |
| `genLapStok(uid, produk, mutasi)` | User ID, products, mutations | produk + mutasi | Stock levels with in/out/value |
| `genLapLabaRugi(uid, trx, biaya)` | User ID, transactions, expenses | transaksi + biaya | Monthly P&L: revenue - COGS - expenses |
| `genLapArusKas(uid, trx, beli, biaya)` | User ID, tx/purchases/expenses | All three | Cash flow with running balance |
| `genLapPiutang(uid, trx)` | User ID, transactions | transaksi (Piutang) | Accounts receivable |
| `genLapHutang(uid, beli)` | User ID, purchases | pembelian (hutang) | Accounts payable |
| `genLapOmsetSales(uid, trx)` | User ID, transactions | transaksi (grouped by sales) | Sales rep performance |
| `genLapInvoicePelanggan(uid, trx)` | User ID, transactions | transaksi (non-draft) | Customer invoice ledger |
| `genLapInvoiceSupplier(uid, beli)` | User ID, purchases | pembelian | Supplier invoice ledger |
| `genLapJatuhTempo(uid, trx, beli)` | User ID, tx/purchases | piutang + hutang with dates | Due date monitor |

---

## Module: `Api.gs` — HTTP Entry Points

### `doGet(e)` — GET Request Router

```javascript
// Public (no auth required)
action=ping          → doPing()          // Health check
action=setup         → setupDatabase()   // Create sheets
action=getCsrfToken  → _generateCsrfToken()  // CSRF token (rate-limited)

// Authenticated (requires token)
action=read          → readAllUser(sheet, uid)       // Read all user rows
action=readOne       → readOne(sheet, id, uid)        // Read single row
action=pullAll       → pullAll(uid)                   // Pull all user data
action=readLaporan   → readAllUser(sheet, uid)        // Read report sheet
action=profile       → {user: safeUser(user)}          // Get profile
```

### `doPost(e)` — POST Request Router

```javascript
// Public (CSRF required for login/register)
action=register      → doRegister(body)       // New user
action=login         → doLogin(body)          // Login
action=setup         → setupDatabase()        // Create sheets

// Authenticated (requires token + rate limit)
action=logout        → doLogout(token)              // Delete session
action=create        → createRow(sheet, data, uid)   // Insert
action=update        → updateRow(sheet, id, data, uid)  // Update
action=delete        → deleteRow(sheet, id, uid)     // Delete
action=upsert        → upsertRow(sheet, data, uid)   // Insert/update
action=bulkSync      → bulkSyncUser(sheet, rows, uid)  // Bulk replace
action=pushAll       → pushAll(data, uid)            // Push all data
action=generateLaporan → generateAllLaporan(uid)      // Generate reports
action=updateProfile → updateProfile(uid, data)      // Update profile
```

### `onOpen()` — Spreadsheet Menu

Adds "Koncowrb" menu with:
- **Setup Database** → `setupDatabase()`
- **Generate Semua Laporan** → `generateAllLaporanUI()` (interactive userId prompt)
- **Info Deploy** → `showDeployInfo()` (deployment instructions alert)

---

## API Request/Response Format

### Request

```javascript
// GET
GET {GAS_URL}?action=read&sheet=produk&token=abc123

// POST
POST {GAS_URL}
Headers: Content-Type: text/plain
Body: JSON.stringify({ action, token, sheet, data, id, ... })
```

### Response

All responses are JSON with `ContentService.MimeType.JSON`:

```javascript
// Success
{
  status: "ok",
  rows: [...],
  count: 42
}

// Error
{
  error: "Email sudah terdaftar",
  code: 409    // optional HTTP-like status
}

// Rate limited
{
  error: "Terlalu banyak permintaan. Coba lagi 30 detik.",
  code: 429,
  retryAfter: 30
}
```

---

## Data Ownership Model

Every row in every sheet (except Sessions and Sync Log) includes a `userId` column. All CRUD operations scope reads/writes to the authenticated user's userId. This provides multi-tenant isolation within a single spreadsheet.

### Enforcement Points

| Operation | Ownership Check |
|-----------|----------------|
| `readAllUser` | Filter: `r[uidCol] === uid` |
| `readOne` | Reject if `r[uidCol] !== uid` → "Akses ditolak" |
| `createRow` | Set `data.userId = uid` on creation |
| `updateRow` | Reject if `r[uidCol] !== uid` |
| `deleteRow` | Reject if `r[uidCol] !== uid` |
| `bulkSyncUser` | Delete all user rows, write new ones with userId |
| All `genLap*` | `delUserRows(sh, uid)` before regenerating |

---

## Deployment

1. Copy all `.gs` files to a new Google Apps Script project
2. Run `setupDatabase()` once to create all sheets
3. Deploy → New deployment → Web App
4. Execute as: **Me** (your Gmail account)
5. Access: **Anyone**
6. Copy the deployment URL
7. Update `GAS_URL` in `stitch/js/sync.js` (line 5) or via in-app sync settings

The frontend (`stitch/` folder) deploys to any static host (Vercel, Netlify, GitHub Pages).
