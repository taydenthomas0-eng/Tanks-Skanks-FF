export default async function handler(req, res) {
  const path = req.query.path;
  if (!path) return res.status(400).json({error:"Missing Sleeper path"});
  const parts = Array.isArray(path) ? path : [path];
  const upstream = "https://api.sleeper.app/v1/" + parts.map(encodeURIComponent).join("/");
  try {
    const r = await fetch(upstream, {headers:{accept:"application/json"}});
    const text = await r.text();
    res.status(r.status).setHeader("Cache-Control","s-maxage=30, stale-while-revalidate=120").send(text);
  } catch (e) { res.status(502).json({error:"Sleeper API unavailable",detail:e.message}); }
}