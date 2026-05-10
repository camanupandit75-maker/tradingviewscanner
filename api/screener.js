const STOCKS = "RELIANCE.NS,HDFCBANK.NS,BHARTIARTL.NS,SBIN.NS,ICICIBANK.NS,INFY.NS,TCS.NS,LT.NS,TITAN.NS,ITC.NS,NTPC.NS,BAJFINANCE.NS,WIPRO.NS,HCLTECH.NS,MARUTI.NS,SUNPHARMA.NS,BRITANNIA.NS,DRREDDY.NS,CIPLA.NS,APOLLOHOSP.NS,JSWSTEEL.NS,HINDALCO.NS,TATASTEEL.NS,VEDL.NS,TECHM.NS,DABUR.NS,PNBHOUSING.NS,YESBANK.NS,PNB.NS,CANBK.NS,MOTHERSON.NS,TATAPOWER.NS,IDEA.NS,SUZLON.NS,BERGEPAINT.NS,LUPIN.NS,COFORGE.NS,HFCL.NS,NBCC.NS,BHEL.NS,HAL.NS,BEL.NS,RECLTD.NS,PFC.NS,GMRAIRPORT.NS,INDUSINDBK.NS,KOTAKBANK.NS,AXISBANK.NS,PERSISTENT.NS,TATACONSUM.NS,NESTLEIND.NS,BAJAJFINSV.NS,EICHERMOT.NS,SBILIFE.NS,HDFCLIFE.NS,ADANIPORTS.NS,GRASIM.NS,INDIGO.NS,MUTHOOTFIN.NS,CHOLAFIN.NS,LTIMINDTREE.NS,PIDILITIND.NS,SHREECEM.NS,BPCL.NS,IRCTC.NS,RVNL.NS,IRFC.NS,NHPC.NS,SJVN.NS,ADANIENT.NS,TATAPOWER.NS,COALINDIA.NS,ONGC.NS,POWERGRID.NS";

async function getYahooCrumb() {
  const page = await fetch("https://finance.yahoo.com/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  const setCookie = page.headers.get("set-cookie") || "";
  const cookieStr = setCookie.split(/,(?=\s*\w+=)/).map(c => c.split(";")[0].trim()).join("; ");

  const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Cookie": cookieStr,
    },
  });
  const crumb = (await crumbRes.text()).trim();
  return { cookieStr, crumb };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const tab = req.query?.tab || "gainers";
  const sortMap = {
    gainers:    ["change",     "desc"],
    losers:     ["change",     "asc"],
    volume:     ["vol_ratio",  "desc"],
    overbought: ["change",     "desc"],
    oversold:   ["change",     "asc"],
    all:        ["market_cap", "desc"],
  };
  const [sortKey, sortDir] = sortMap[tab] || sortMap.gainers;

  try {
    const { cookieStr, crumb } = await getYahooCrumb();
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${STOCKS}&crumb=${encodeURIComponent(crumb)}`;

    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Cookie": cookieStr,
        "Accept": "application/json",
      },
    });

    if (!r.ok) return res.status(r.status).json({ error: `Yahoo: ${r.status}` });

    const json = await r.json();
    let quotes = (json?.quoteResponse?.result || []).map(q => ({
      name:       q.symbol?.replace(".NS", "") ?? "",
      close:      q.regularMarketPrice ?? null,
      change:     q.regularMarketChangePercent ?? null,
      volume:     q.regularMarketVolume ?? null,
      market_cap: q.marketCap ?? null,
      RSI: null, macd: null, sector: null, perf1m: null, perf1w: null,
      vol_ratio: q.averageDailyVolume10Day
        ? Math.round(q.regularMarketVolume / q.averageDailyVolume10Day * 100) / 100
        : null,
    }));

    quotes.sort((a, b) => {
      const av = a[sortKey] ?? (sortDir === "desc" ? -Infinity : Infinity);
      const bv = b[sortKey] ?? (sortDir === "desc" ? -Infinity : Infinity);
      return sortDir === "desc" ? bv - av : av - bv;
    });

    return res.status(200).json({ quotes: quotes.slice(0, 50) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
