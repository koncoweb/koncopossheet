# KONCOPOS — Architecture

## Overview

KONCOPOS is an offline-first Point of Sale (POS) web application with Google Sheets as its database. It uses a **fat-client / thin-server** architecture: all business logic runs in the browser, and Google Sheets serves as a remote data store via Google Apps Script (GAS).

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ POS UI   │  │ Reports  │  │ Settings │             │
│  │ pos.js   │  │ laporan  │  │ pengatur │             │
│  │          │  │ .js      │  │ an.js    │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │              │              │                   │
│  ┌────▼──────────────▼──────────────▼─────┐            │
│  │         sync.js (Data Layer)           │            │
│  │  ┌──────────────────────────────────┐  │            │
│  │  │     localStorage (offline DB)    │  │            │
│  │  └──────────────────────────────────┘  │            │
│  │  ┌──────────────────────────────────┐  │            │
│  │  │  gasRequest() — API client       │  │            │
│  │  └──────────────────────────────────┘  │            │
│  └──────────────────┬─────────────────────┘            │
│                     │                                   │
│              auth.js (session)                          │
│              core.js (router, toasts)                   │
└─────────────────────┼───────────────────────────────────┘
                      │ HTTPS (fetch)
┌─────────────────────▼───────────────────────────────────┐
│        Google Apps Script (GAS) Web App Backend         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Api.gs          — doGet() / doPost() router     │  │
│  │  Auth.gs         — register, login, sessions     │  │
│  │  Crud.gs         — readAllUser, createRow, ...   │  │
│  │  Reports.gs      — 11 report generators          │  │
│  │  Security.gs     — rate limiting, CSRF           │  │
│  │  Helpers.gs      — utilities, shared helpers     │  │
│  │  Sync.gs         — pushAll, pullAll              │  │
│  │  Database.gs     — setupDatabase, schema mgmt    │  │
│  │  Config.gs       — SHEETS, SCHEMAS, RATE_CONFIG  │  │
│  └──────────────────────┬───────────────────────────┘  │
│                         │                               │
│  ┌──────────────────────▼───────────────────────────┐  │
│  │            Google Sheets (Database)               │  │
│  │  24 sheets: Users, Produk, Transaksi, ...        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla JS (no framework), CSS custom properties |
| **Routing** | Hash-based SPA with custom `switchScreen()` |
| **State** | `localStorage` via `DB.get()` / `DB.set()` |
| **Charts** | Chart.js 4.x (CDN) |
| **PDF Export** | jsPDF + jsPDF-AutoTable (CDN) |
| **Icons** | Font Awesome 6 (CDN) |
| **Printing** | Web Bluetooth API / ESC/POS commands |
| **Backend** | Google Apps Script (9 modular .gs files) |
| **Database** | Google Sheets (24 sheets, multi-user scoped) |
| **Auth** | Custom token-based sessions (30-day expiry) |
| **Deploy** | Frontend: Vercel/Netlify (static). Backend: GAS Web App |
| **PWA** | Service Worker, manifest.json, offline capability |

---

## Data Flow

### Offline-First Sync Pattern

```
User Action
    │
    ▼
┌─────────────┐     write first     ┌──────────────┐
│  UI (pos.js,│────────────────────►│ localStorage │
│  biaya.js)  │                     │  (source of  │
└─────────────┘                     │   truth)     │
                                    └──────┬───────┘
                                           │ debounced (1500ms)
                                           ▼
                                    ┌──────────────┐
                                    │  autoSync()  │
                                    │  sync.js     │
                                    └──────┬───────┘
                                           │ gasRequest()
                                           ▼
                                    ┌──────────────┐
                                    │ GAS Backend  │
                                    │  HTTP API    │
                                    └──────┬───────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │ Google Sheets│
                                    └──────────────┘
```

### Key Operations

| Action | Frontend → Backend | GAS Action |
|--------|-------------------|------------|
| **Startup** | `pullAll` (GET all data) | `pullAll(user)` reads all user-scoped sheets |
| **CRUD** | `create`/`update`/`delete` | Direct sheet operations |
| **Bulk Sync** | `pushAll` (POST all local data) | `pushAll(data, user)` full replace + report gen |
| **Reports** | `generateLaporan` | Server-side `genLap*()` functions |
| **Auth** | `register`/`login`/`logout` | User + session management |

---

## File Map

```
stitch/
├── index.html              Entry point, loads all scripts
├── style.css               4679 lines — full design system
├── vercel.json             Vercel deploy config (no-cache headers)
├── manifest.json           PWA manifest
├── sw.js                   Service Worker (network-first, offline fallback)
│
├── js/                     Frontend modules (12 files)
│   ├── core.js             Router, storage, toast, clock, events
│   ├── auth.js             Login, register, session check
│   ├── sync.js             GAS API client, auto-sync engine
│   ├── pos.js              POS screen, cart, checkout, receipt
│   ├── beranda.js          Dashboard with Chart.js
│   ├── produk.js           Product CRUD, camera, barcode
│   ├── pembelian.js        Purchases, stock mutations
│   ├── biaya.js            Expenses & income
│   ├── laporan.js          14 report screens
│   ├── pengaturan.js       All master data CRUD
│   ├── pdf-export.js       PDF generation via jsPDF
│   └── printer.js          Bluetooth thermal printer (ESC/POS)
│
├── pages/                  HTML fragments loaded at runtime (52 files)
│   ├── login.html, register.html
│   ├── beranda.html
│   ├── pos.html, keranjang.html, checkout.html, struk.html
│   ├── laporan.html + 14 laporan-*.html
│   └── pengaturan.html + ~20 crud form pages
│
├── gas/                    Google Apps Script backend (9 files)
│   ├── Config.gs           Global config, sheets, schemas
│   ├── Helpers.gs          Utilities + 5 shared helpers
│   ├── Security.gs         Rate limiting, CSRF
│   ├── Database.gs         Sheet setup, schema migration
│   ├── Auth.gs             Registration, login, sessions
│   ├── Crud.gs             CRUD operations, bulk sync
│   ├── Sync.gs             pushAll, pullAll
│   ├── Reports.gs          11 report generators
│   └── Api.gs              doGet/doPost entry points + menu
│
├── icons/                  PWA icons (192px, 512px)
└── koncowrb_*/             Screenshots for docs
```

---

## Routing Architecture

```
Hash-Based SPA Router (core.js:14-113)
│
├── switchScreen(name, params)
│   ├── Fetch pages/{name}.html
│   ├── Toggle .active class
│   ├── Update bottom nav
│   ├── history.pushState()
│   └── Dispatch 'screenInit' CustomEvent
│
├── NAV_PARENT map:
│   │  Screen → Parent Tab mapping
│   │  Auth screens → null (hide nav)
│   │  Sub-screens → pos|biaya|beranda|laporan|pengaturan
│   │
│   ├── Tab: POS       → pos, keranjang, checkout, struk
│   ├── Tab: Biaya     → biaya, add-biaya
│   ├── Tab: Beranda   → beranda
│   ├── Tab: Laporan   → laporan + 14 sub-reports
│   └── Tab: Pengaturan → pengaturan + 20 sub-pages
│
└── popstate listener for back-button
```

---

## Design Principles

1. **Offline-first**: LocalStorage is the source of truth; cloud sync is background
2. **No build step**: Vanilla JS loaded via `<script>` tags in `index.html`
3. **Multi-tenant**: Every row scoped by `userId` in Sheets; GAS enforces isolation
4. **Mobile-first**: All screens designed for phone-width (portrait), bottom navigation
5. **Progressive**: Works without service worker, barcode scanner degrades gracefully
6. **One GAS project per instance**: Each user has their own spreadsheet + GAS deployment
