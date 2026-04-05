# Net Worth Tracker

A Firebase-synced finance dashboard for:

- current accounts
- cash and investment ISAs
- savings and other bank balances
- liabilities such as mortgages, cards, loans, and overdrafts
- crypto and share holdings with refreshed market prices
- balances stored in other currencies and converted to GBP

## What it does now

- separates the experience into `Overview` and `Monthly Entry`
- stores balances month by month
- supports manual balances and live-priced holdings
- lets ISA lines store monthly contribution amounts separately from balances
- converts non-GBP balances into GBP using Bank of England spot-rate data
- refreshes crypto and share prices through a hosting function
- keeps data synced across devices with Firebase
- works as an installable PWA
- clears the locally cached tracker on sign-out so the next user starts with a blank dashboard

## Main files

- [`index.html`](./index.html): app layout
- [`styles.css`](./styles.css): visual design
- [`app.js`](./app.js): state, calculations, charts, sync, market refresh, and PWA install flow
- [`firebase-config.js`](./firebase-config.js): Firebase web app keys
- [`firebase-service.js`](./firebase-service.js): Firebase auth and Firestore sync helper
- [`firestore.rules`](./firestore.rules): private per-user Firestore rules
- [`manifest.webmanifest`](./manifest.webmanifest): installable app metadata
- [`service-worker.js`](./service-worker.js): app-shell caching
- [`icon.svg`](./icon.svg): app icon
- [`market-data-service.js`](./market-data-service.js): shared Bank of England FX + crypto/share quote logic
- [`netlify/functions/market-data.js`](./netlify/functions/market-data.js): Netlify function entry point
- [`api/market-data.js`](./api/market-data.js): Vercel function entry point
- [`netlify.toml`](./netlify.toml): Netlify config

## How balances work

Each line can be:

- `manual`: you enter the native-currency balance yourself each month
- `market`: you store quantity and the app values it using the latest quote

Examples:

- Barclays Current in GBP: manual
- Cash ISA in GBP: manual
- Apple Shares in USD: market
- Bitcoin in USD: market
- Mortgage in GBP: manual liability

For ISA tax-year tracking:

- balances and contributions are separate
- the ISA allowance panel uses the monthly ISA contribution fields, not balance growth
- the allowance constants in the app are currently set to `£20,000` overall and `£4,000` for Lifetime ISA usage

## Free setup notes

The app stays as free as possible with this setup:

- hosting: Netlify or Vercel
- login + cloud storage: Firebase Spark plan
- crypto: CoinGecko demo/free access
- stocks: Alpha Vantage free API key
- FX: Bank of England public rates page

## Hosting setup for market refresh

The market refresh feature needs a host that publishes backend functions.

This repo now supports both:

- Netlify via [`netlify/functions/market-data.js`](./netlify/functions/market-data.js)
- Vercel via [`api/market-data.js`](./api/market-data.js)

Optional but recommended environment variables on either host:

- `COINGECKO_DEMO_API_KEY`
- `ALPHAVANTAGE_API_KEY`

Where to add them:

1. Open your hosting project settings
2. Open `Environment variables`
3. Add the variables
4. Redeploy the site

### Why they matter

- Crypto quotes can work better with a CoinGecko demo key
- Share quotes need an Alpha Vantage key
- FX conversion does not need a key

## Firebase setup

You still need:

1. Firebase web app config in [`firebase-config.js`](./firebase-config.js)
2. `Email/Password` enabled in Firebase Authentication
3. Firestore created in production mode
4. [`firestore.rules`](./firestore.rules) published
5. your deployed site domain added to Firebase `Authorized domains`

## PWA install

After deployment:

- on iPhone: open the site in Safari and use `Add to Home Screen`
- on desktop Chrome/Edge: use the browser install prompt

## Notes on pricing

- The web app itself can stay free on Netlify + Firebase Spark within their free limits
- Public App Store distribution is not free
- Free stock APIs are limited, so share prices are best treated as refreshable daily data rather than guaranteed real-time data
