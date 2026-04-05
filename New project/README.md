# Net Worth Tracker

This version is simplified for one hosting path:

- Vercel for the website and market-data function
- Firebase for sign-in and synced storage
- Bank of England, CoinGecko, and Alpha Vantage for refreshable market data

## Main runtime files

- [`index.html`](./index.html): page structure
- [`styles.css`](./styles.css): app styling
- [`app.js`](./app.js): tracker logic, charts, syncing, ISA summaries, and market refresh
- [`firebase-config.js`](./firebase-config.js): your Firebase web app config
- [`firebase-service.js`](./firebase-service.js): Firebase auth and Firestore sync
- [`firestore.rules`](./firestore.rules): private user-only data rules
- [`manifest.webmanifest`](./manifest.webmanifest): install metadata
- [`service-worker.js`](./service-worker.js): offline shell caching
- [`icon.svg`](./icon.svg): app icon
- [`market-data-service.js`](./market-data-service.js): shared market and FX fetch logic
- [`api/market-data.js`](./api/market-data.js): Vercel backend function
- [`vercel.json`](./vercel.json): explicit Vercel routing and headers

## What this app does

- tracks assets and liabilities by month
- separates overview and monthly-entry views
- supports current accounts, savings, ISAs, crypto, shares, and debts
- supports balances in multiple currencies
- converts balances to GBP using Bank of England data
- refreshes crypto and stock prices through a Vercel function
- tracks ISA balances and tax-year contributions separately
- clears local data on sign-out so the next user sees a blank tracker

## Required Vercel environment variables

- `ALPHAVANTAGE_API_KEY`
- `COINGECKO_DEMO_API_KEY` optional but recommended

After changing environment variables in Vercel, redeploy the project.

## Required Firebase setup

1. Put your real Firebase values into [`firebase-config.js`](./firebase-config.js)
2. Enable `Email/Password` in Firebase Authentication
3. Create Firestore
4. Publish [`firestore.rules`](./firestore.rules)
5. Add your `*.vercel.app` domain to Firebase `Authorized domains`
