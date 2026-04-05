const BOE_URL = "https://www.bankofengland.co.uk/boeapps/database/Rates.asp?Travel=NIxAZxSUx&into=GBP";

const CURRENCY_NAME_MAP = {
  "Australian Dollar": "AUD",
  "Canadian Dollar": "CAD",
  "Chinese Renminbi": "CNY",
  "Danish Krone": "DKK",
  Euro: "EUR",
  "Hong Kong Dollar": "HKD",
  "Indian Rupee": "INR",
  "Japanese Yen": "JPY",
  "New Zealand Dollar": "NZD",
  "Norwegian Krone": "NOK",
  "Singapore Dollar": "SGD",
  "South African Rand": "ZAR",
  "Swedish Krona": "SEK",
  "Swiss Franc": "CHF",
  "US Dollar": "USD",
  "Nigerian Naira": "NGN",
};

const COIN_MAP = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOT: "polkadot",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  BNB: "binancecoin",
  LINK: "chainlink",
  LTC: "litecoin",
};

async function getMarketData(payload, env) {
  const safePayload = payload && typeof payload === "object" ? payload : {};
  const safeEnv = env || {};
  const currencies = Array.from(new Set((safePayload.currencies || []).map(toCode))).filter(Boolean);
  const cryptoSymbols = sanitizeQuoteRequests(safePayload.cryptoSymbols || []);
  const stockSymbols = sanitizeQuoteRequests(safePayload.stockSymbols || []);
  const warnings = [];

  const fxData = await fetchBoeRates(currencies, warnings);
  const cryptoQuotes = await fetchCryptoQuotes(cryptoSymbols, warnings, safeEnv);
  const stockQuotes = await fetchStockQuotes(stockSymbols, warnings, safeEnv);

  return {
    updatedAt: new Date().toISOString(),
    fxRates: {
      GBP: 1,
      ...fxData.rates,
    },
    fxMeta: {
      source: "Bank of England",
      asOf: fxData.asOf || new Date().toISOString(),
    },
    cryptoQuotes,
    stockQuotes,
    warnings,
  };
}

function sanitizeQuoteRequests(requests) {
  const seen = new Set();
  return requests
    .map((request) => ({
      symbol: String(request.symbol || "").trim().toUpperCase(),
      currency: toCode(request.currency),
    }))
    .filter((request) => request.symbol && request.currency)
    .filter((request) => {
      const key = `${request.symbol}|${request.currency}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function toCode(value) {
  return String(value || "").trim().toUpperCase();
}

async function fetchBoeRates(requestedCurrencies, warnings) {
  if (!requestedCurrencies.length) {
    return { rates: {}, asOf: new Date().toISOString() };
  }

  const response = await fetch(BOE_URL);
  if (!response.ok) {
    throw new Error(`Bank of England request failed with ${response.status}`);
  }

  const html = await response.text();
  const rates = {};
  const rowMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];

  rowMatches.forEach((row) => {
    const cells = Array.from(row.matchAll(/<td[\s\S]*?>([\s\S]*?)<\/td>/gi)).map((match) => stripHtml(match[1]));
    if (cells.length < 2) {
      return;
    }

    const currencyCode = CURRENCY_NAME_MAP[cells[0]];
    const numericRate = Number(cells[1].replace(/,/g, ""));
    if (currencyCode && Number.isFinite(numericRate)) {
      rates[currencyCode] = numericRate;
    }
  });

  requestedCurrencies.forEach((currency) => {
    if (!rates[currency]) {
      warnings.push(`Bank of England rate not found for ${currency}.`);
    }
  });

  return {
    rates,
    asOf: new Date().toISOString(),
  };
}

async function fetchCryptoQuotes(requests, warnings, env) {
  if (!requests.length) {
    return {};
  }

  const resolved = requests
    .map((request) => ({
      symbol: request.symbol,
      currency: request.currency,
      id: resolveCoinId(request.symbol),
    }))
    .filter((request) => {
      if (!request.id) {
        warnings.push(`Crypto symbol ${request.symbol} is not mapped yet. Try a major coin ticker like BTC or ETH.`);
        return false;
      }
      return true;
    });

  if (!resolved.length) {
    return {};
  }

  const ids = Array.from(new Set(resolved.map((request) => request.id)));
  const vsCurrencies = Array.from(new Set(resolved.map((request) => request.currency.toLowerCase())));
  const url = new URL("https://api.coingecko.com/api/v3/simple/price");
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set("vs_currencies", vsCurrencies.join(","));
  url.searchParams.set("include_last_updated_at", "true");

  const headers = {
    accept: "application/json",
  };
  if (env.COINGECKO_DEMO_API_KEY) {
    headers["x-cg-demo-api-key"] = env.COINGECKO_DEMO_API_KEY;
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    warnings.push("CoinGecko request failed. Add COINGECKO_DEMO_API_KEY in your hosting dashboard if needed.");
    return {};
  }

  const payload = await response.json();
  const quotes = {};

  resolved.forEach((request) => {
    const data = payload[request.id];
    const price = data && data[request.currency.toLowerCase()];
    if (!Number.isFinite(price)) {
      warnings.push(`No crypto price returned for ${request.symbol} in ${request.currency}.`);
      return;
    }

    quotes[request.symbol] = {
      price,
      currency: request.currency,
      source: "CoinGecko",
      asOf: data.last_updated_at ? new Date(data.last_updated_at * 1000).toISOString() : new Date().toISOString(),
    };
  });

  return quotes;
}

async function fetchStockQuotes(requests, warnings, env) {
  if (!requests.length) {
    return {};
  }

  if (!env.ALPHAVANTAGE_API_KEY) {
    warnings.push("Stock quotes need a free Alpha Vantage API key in your hosting env var ALPHAVANTAGE_API_KEY.");
    return {};
  }

  const quotes = {};

  for (let index = 0; index < requests.length; index += 1) {
    const request = requests[index];
    const url = new URL("https://www.alphavantage.co/query");
    url.searchParams.set("function", "GLOBAL_QUOTE");
    url.searchParams.set("symbol", request.symbol);
    url.searchParams.set("apikey", env.ALPHAVANTAGE_API_KEY);

    const response = await fetch(url.toString());
    if (!response.ok) {
      warnings.push(`Alpha Vantage request failed for ${request.symbol}.`);
      continue;
    }

    const payload = await response.json();
    if (payload.Note) {
      warnings.push("Alpha Vantage rate limit reached. Free plans are limited, so try again later.");
      break;
    }

    const quote = payload["Global Quote"];
    const price = quote ? Number(quote["05. price"]) : NaN;
    if (!Number.isFinite(price)) {
      warnings.push(`No stock price returned for ${request.symbol}. Check the ticker format.`);
      continue;
    }

    quotes[request.symbol] = {
      price,
      currency: request.currency,
      source: "Alpha Vantage",
      asOf: new Date().toISOString(),
    };
  }

  return quotes;
}

function resolveCoinId(symbol) {
  const upper = String(symbol || "").trim().toUpperCase();
  if (COIN_MAP[upper]) {
    return COIN_MAP[upper];
  }

  if (upper.toLowerCase().includes("-")) {
    return upper.toLowerCase();
  }

  return "";
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

module.exports = {
  getMarketData,
};
