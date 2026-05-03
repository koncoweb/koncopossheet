# KONCOPOS — Frontend

## Overview

Pure vanilla JavaScript SPA. No React, Vue, or bundler. All 12 JS files are loaded via `<script>` tags in `stitch/index.html` and share a global scope. UI is rendered by injecting HTML fragments from `stitch/pages/` into `#app`.

**Entry file**: `stitch/index.html`  
**Entry function**: `initAuth()` in `core.js:197` (called on `DOMContentLoaded`)

---

## Module Dependency Graph

```
index.html loads scripts in this order:
─────────────────────────────────────────
core.js ───────────────► Storage, router, toast, clock, events
  │
  ├── beranda.js ──────► Dashboard (Chart.js)
  ├── produk.js ───────► Product CRUD, camera, barcode
  ├── pos.js ──────────► POS screen, cart, checkout, receipt
  ├── biaya.js ────────► Expense/income management
  ├── pembelian.js ────► Purchases, stock mutations
  ├── pengaturan.js ───► All master data CRUD + settings
  ├── laporan.js ──────► 14 report renderers
  ├── pdf-export.js ───► jsPDF export functions
  ├── printer.js ──────► Bluetooth thermal printer
  ├── sync.js ─────────► GAS API client, auto-sync engine
  └── auth.js ─────────► Login/register, session, event binding
```

---

## Module: `core.js` — Foundation

**File**: `stitch/js/core.js` (lines: ~200)

### Storage API

```javascript
DB.get(key)      // Reads array from localStorage → JSON.parse
DB.set(key, val) // Writes array to localStorage → JSON.stringify
DB.getObj(key)   // Reads object from localStorage
DB.setObj(key)   // Writes object to localStorage
```

### Router

```javascript
switchScreen(name, params)     // Navigate to page, load HTML, fire 'screenInit' event
goBack()                       // history.back()
```

**NAV_PARENT** map (`core.js:17-48`) defines which bottom-nav tab each screen belongs to. Auth screens (login, register) map to `null` (hide nav).

**Screen loading** (`core.js:55-80`):
1. Fetches `pages/{name}.html` with `?v=Date.now()` cache buster
2. Appends HTML fragment as `<div id="screen-{name}">` in `#app`
3. Sets `.active` class for CSS visibility
4. Updates nav tab active state
5. Dispatches `CustomEvent('screenInit', {detail: {name, params}})`

### Toast

```javascript
showToast(message, type)  // type: 'success'|'error'|'info', auto-hides after 3s
```

### Live Clock

```javascript
updateClock()  // Updates #clock element every second (HH:MM format)
```

---

## Module: `auth.js` — Authentication

**File**: `stitch/js/auth.js` (lines: ~170)

### State

```javascript
_currentUser    // {id, email, namaLengkap, namaUsaha, ...}
_sessionToken   // 64-char token string
```

### Functions

| Function | Description |
|----------|-------------|
| `initAuth()` | Boot check: verify saved token via `authRequest({action:'profile'})`, fallback to local session if offline |
| `switchToLogin()` / `switchToRegister()` | Navigate to auth screens |
| `handleLogin(email, password)` | CSRF token → login POST → save session → `pullAllFromSheet()` |
| `handleRegister(formData)` | CSRF token → register POST → set up empty data |
| `handleLogout()` | Server logout → clear localStorage (except config) → back to login |
| `_saveSession(token, user)` | Store token + user in memory and localStorage |
| `_onLoginComplete()` | After login, reload app screen, update UI, pull data |
| `_setupDefaultMasterData()` | Init empty arrays for kategori, metodePembayaran, jenisPenjualan, kategoriBiaya |

### Event Binding

Listens for:
- `screenInit` → `login`, `register` pages: binds form submit handlers
- Login form `#loginForm` → `handleLogin()`
- Register form `#registerForm` → `handleRegister()`
- Logout button click (delegated) → `handleLogout()`

---

## Module: `sync.js` — Data Layer & API Client

**File**: `stitch/js/sync.js` (lines: ~412)

### Configuration

```javascript
const GAS_URL = 'https://script.google.com/macros/s/.../exec';  // Default URL
```
Overridable via localStorage `gasConfig.url` or in-app sync settings page.

### Core API Client

```javascript
gasRequest(options)
```

| Parameter | Description |
|-----------|-------------|
| `options.body` | POST body (object), auto-serialized to JSON |
| `options.query` | GET query params (object) |
| `options.action` | Shorthand: `gasRequest({query:{action:'read', sheet:'produk'}})` |

**Auto-injects** `token` from `_sessionToken` into body or query.  
**Retries** on 429 (rate limit) up to 2 times with exponential backoff.  
**For login/register**: auto-fetches `csrf_token` via `getCsrfToken` action.

### Auto-Sync Engine

```javascript
autoSync(action, sheet, data, id)  // Queue operations, debounced (1500ms)
_flushSync()                        // Process queue, trigger reports if needed
```

Operations queued per sheet. On flush:
1. Calls appropriate GAS action (`create`/`update`/`delete`)
2. If relevant sheets modified (`transaksi`, `pembelian`, `mutasi`, `biaya`, `produk`) → triggers `generateLaporan`

### Bulk Operations

```javascript
pushAllToSheet()       // POST all localStorage data to GAS
pullAllFromSheet()     // GET all data from GAS → replace localStorage
generateLaporanGAS()   // Trigger server-side report generation
```

### Sync Status

```javascript
setSyncStatus(status)  // 'idle'|'syncing'|'ok'|'error'
```
Updates `#syncStatus` UI element (spinner animation in CSS).

---

## Module: `pos.js` — Point of Sale

**File**: `stitch/js/pos.js` (lines: ~1342)

### Screens

| Screen | Description |
|--------|-------------|
| `pos` | Product grid/list, cart, category filter |
| `keranjang` | Detailed cart view with edit/delete |
| `checkout` | Payment: method, cash input, denominations, change |
| `struk` | Receipt: print, share, WhatsApp |
| `pos-settings` | Cart display toggles, printer settings |

### Key Functions

```javascript
renderPosProducts(filter)       // Render product grid filtered by category/search
addToCart(product, qty)         // Add to localStorage cart[]
updateCartBar()                 // Update bottom cart item count badge
updateTotals()                  // Calculate subtotal, discount, tax, total
handleCheckout()                // Process payment, create transaction
saveDraft()                     // Save incomplete transaction as isDraft
renderStruk(transaction)        // Render receipt screen
printStruk(transaction)         // Print via Bluetooth or browser
shareStruk(transaction)         // WhatsApp / Web Share API
applyPosSettings()              // Read cart display toggles from settings
```

### Data Flow

```
Product Selection → addToCart() → localStorage cart[]
    │
    ▼
Cart View → updateTotals() → live calculation
    │
    ▼
Checkout → handleCheckout() → transaksi[] + autoSync()
    │
    ▼
Receipt → renderStruk() → print / share
```

### Cart Object

```javascript
{
  id: "gs_12345_abc",     // Generated ID
  produkId: "gs_67890_def", // Product reference
  nama: "Nasi Goreng",
  varian: "Original",
  harga: 15000,           // Selling price
  hargaBeli: 10000,       // Cost (for profit calc)
  qty: 2,
  diskonPct: 0,           // Per-item discount %
  diskonRp: 0,            // Per-item discount Rp
  unit: "Pcs",
  subtotal: 30000
}
```

### Transaction Object

```javascript
{
  id: "INV-250101-001",   // Auto-generated invoice number
  userId: "...",
  tanggal: "2025-01-01T10:00:00Z",
  tglJthTempo: null,     // Only for Piutang
  pelangganId: null,
  pelanggan: "Umum",
  noMeja: "01",
  jenisPenjualan: "Reguler",
  salesId: null,
  sales: "",
  items: [...],           // Array of cart items
  total: 30000,
  metodePembayaran: "Tunai",
  catatan: "",
  bayar: 50000,
  kembalian: 20000,
  lunas: true,
  isDraft: false
}
```

---

## Module: `beranda.js` — Dashboard

**File**: `stitch/js/beranda.js` (lines: ~106)

**Screen**: `beranda`

- 7-day sales bar chart (Chart.js)
- Filter by day/week/month/year
- Summary table: paid vs unpaid transactions
- Quick menu links: Pembelian, Mutasi Stok, Master Produk, Bayar Supplier, Pelanggan Bayar, Rekapan

---

## Module: `produk.js` — Product Management

**File**: `stitch/js/produk.js` (lines: ~561)

### Screens

| Screen | Description |
|--------|-------------|
| `master-produk` | Product list with search, filter by category |
| `add-produk` | Add/edit product form |
| `varian` | Manage product variants (price, stock per variant) |
| `grosir` | Wholesale pricing tiers (min qty → price) |
| `kategori` | Category CRUD |

### Features

- Camera photo capture (stored as base64 in product `foto` field)
- Barcode scanner via `BarcodeDetector` API
- Stock tracking with minimum alert
- Category management with auto-ID prefix

---

## Module: `biaya.js` — Expenses

**File**: `stitch/js/biaya.js` (lines: ~215)

**Screen**: `biaya`, `add-biaya`

- List expenses/income with date filter and search
- Add form: method, category, amount, type (biaya/pendapatan), profit/loss toggle
- Summary cards: total expenses, income, net

---

## Module: `pembelian.js` — Purchases

**File**: `stitch/js/pembelian.js` (lines: ~387)

### Screens

| Screen | Description |
|--------|-------------|
| `pembelian` | Purchase list |
| `add-pembelian` | Add purchase: product, supplier, qty, price |
| `bayar-supplier` | Supplier payment list |
| `pelanggan-bayar` | Customer payment list |
| `rekapan` | Summary: revenue, purchases, expenses, net |

---

## Module: `laporan.js` — Reports

**File**: `stitch/js/laporan.js` (lines: ~1218+)

### Screens

| # | Screen Name | Report |
|---|-------------|--------|
| 1 | `laporan-penjualan` | Sales Report — all transactions with filters, summary cards |
| 2 | `laporan-produk-terjual` | Products Sold — aggregated by name, qty, total |
| 3 | `laporan-piutang` | Receivables — customer debts, status |
| 4 | `laporan-pembelian` | Purchases — all with status |
| 5 | `laporan-hutang` | Payables — supplier debts |
| 6 | `laporan-stok` | Stock — current levels with value |
| 7 | `laporan-mutasi` | Stock Mutations — in/out/correction history |
| 8 | `laporan-laba-rugi` | P&L — Revenue - COGS - Expenses = Net |
| 9 | `laporan-arus-kas` | Cash Flow — timeline with running balance |
| 10 | `laporan-biaya` | Expenses & Other Income |
| 11 | `laporan-omset-sales` | Sales Performance by salesperson |
| 12 | `laporan-invoice-pelanggan` | Customer Invoices |
| 13 | `laporan-invoice-supplier` | Supplier Invoices |
| 14 | `laporan-jatuh-tempo` | Due Date Monitor |

All reports support: date filter, search, PDF export, Excel (CSV) export.

---

## Module: `pengaturan.js` — Settings & Master Data

**File**: `stitch/js/pengaturan.js` (lines: ~681)

### Screens

| Screen | Description |
|--------|-------------|
| `pengaturan` | Settings home — list of config categories |
| `outlet` | Store info: name, address, phone, email, receipt footer |
| `akun` | User profile with sync to GAS |
| `ganti-password` | Password change |
| `master-supplier` | Supplier CRUD |
| `master-pelanggan` | Customer CRUD |
| `master-sales` | Sales person CRUD |
| `master-kurir` | Courier CRUD |
| `master-kasir` | Cashier accounts with 14 granular permissions |
| `master-jenis-penjualan` | Sales types CRUD |
| `master-metode-pembayaran` | Payment methods CRUD |
| `master-kategori-biaya` | Expense categories CRUD |
| `sync-settings` | GAS URL configuration |
| `pos-settings` | POS cart display toggles |
| `pos-advanced` | Product display mode, stock visibility, layout, sort |
| `pengaturan-printer` | Bluetooth printer configuration |

---

## Module: `printer.js` — Bluetooth Printing

**File**: `stitch/js/printer.js` (lines: ~550)

- Web Bluetooth API for thermal printer connection
- ESC/POS commands: init, alignment, bold, double-width, feed, cut
- Receipt formatting: header, items table, totals, footer
- Configurable: 58mm/80mm paper, auto-cut, cash drawer, kitchen copy
- Fallback: `window.open()` with formatted HTML for browser printing

**ESC/POS Command Examples**:
```
0x1B 0x40        // Initialize printer
0x1B 0x61 0x01   // Center alignment
0x1B 0x45 0x01   // Bold on
0x1B 0x21 0x20   // Double width
0x1B 0x64 0x03   // Feed 3 lines
0x1B 0x69        // Partial cut
```

---

## Module: `pdf-export.js` — PDF Generation

**File**: `stitch/js/pdf-export.js` (lines: ~826)

- Uses `window.jspdf.jsPDF` and `jsPDFAutoTable` (CDN)
- Per-report export functions with consistent header/footer
- Includes: outlet name, period info, formatted tables, totals row

---

## UI Design System

**File**: `stitch/style.css` (4679 lines)

### CSS Variables

```css
:root {
  --primary: #e8637a;       /* Brand pink/red */
  --danger: #e74c3c;        /* Error red */
  --success: #2ecc71;       /* Success green */
  --warning: #f39c12;       /* Warning orange */
  --bg: #f5f5f5;            /* Page background */
  --card-bg: #ffffff;       /* Card background */
  --text: #2c3e50;          /* Primary text */
  --text-light: #7f8c8d;    /* Secondary text */
  --border: #ecf0f1;        /* Border color */
  --radius: 12px;           /* Border radius */
}
```

### Layout Components

| Class | Purpose |
|-------|---------|
| `.topbar` | Top app bar (52px), title + back button |
| `.bottom-nav` | Bottom navigation (62px), 5 tabs |
| `#app` | Main content area between topbar and navbar |
| `.card` | Elevated content container |
| `.list-menu` | List with hover effects |
| `.modal-overlay` | Full-screen modal background |
| `.modal-sheet` | Bottom sheet overlay |
| `.toast` | Notification popup (auto-hiding) |

### Responsive: Mobile-first, portrait orientation, max-width 480px content
