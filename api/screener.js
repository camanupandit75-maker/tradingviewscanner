const STOCKS = "RELIANCE.NS,HDFCBANK.NS,BHARTIARTL.NS,SBIN.NS,ICICIBANK.NS,INFY.NS,TCS.NS,LT.NS,TITAN.NS,ITC.NS,NTPC.NS,BAJFINANCE.NS,WIPRO.NS,HCLTECH.NS,MARUTI.NS,SUNPHARMA.NS,BRITANNIA.NS,DRREDDY.NS,CIPLA.NS,APOLLOHOSP.NS,JSWSTEEL.NS,HINDALCO.NS,TATASTEEL.NS,VEDL.NS,SHREECEM.NS,BPCL.NS,TECHM.NS,DABUR.NS,PNBHOUSING.NS,YESBANK.NS,PNB.NS,CANBK.NS,MOTHERSON.NS,TATAPOWER.NS,IDEA.NS,SUZLON.NS,BERGEPAINT.NS,LUPIN.NS,COFORGE.NS,HFCL.NS,NBCC.NS,BHEL.NS,HAL.NS,BEL.NS,RECLTD.NS,PFC.NS,GMRAIRPORT.NS,FSL.NS,AEROFLEX.NS,THERMAX.NS,JAINREC.NS,SANDUMA.NS,NUVAMA.NS,SONATSOFTW.NS,SKYGOLD.NS,METROPOLIS.NS,MRPL.NS,SENCO.NS,SCI.NS,OLECTRA.NS,LALPATHLAB.NS,PIRAMALFIN.NS,STLTECH.NS,FINCABLES.NS,DALBHARAT.NS,ESCORTS.NS,ACMESOLAR.NS,HCC.NS,KALYANKJIL.NS,UJJIVANSFB.NS,OLAELEC.NS,IDFCFIRSTB.NS,TATACHEM.NS,INDIGO.NS,PERSISTENT.NS,TATACONSUM.NS,NESTLEIND.NS,BAJAJFINSV.NS,EICHERMOT.NS,SBILIFE.NS,HDFCLIFE.NS,ADANIPORTS.NS,KOTAKBANK.NS,AXISBANK.NS,INDUSINDBK.NS";

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
    const r = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${STOCKS}&lang=en&region=IN`,
      { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }
    );
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
