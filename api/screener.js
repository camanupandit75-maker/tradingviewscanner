export default async function handler(req, res) {
  const response = await fetch("https://scanner.tradingview.com/india/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body),
  });
  const data = await response.json();
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json(data);
}
