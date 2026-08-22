export default async function handler(req, res) {
  const { type = 'balance' } = req.query;
  const PLAN_API_URL = "http://n6.ozima.cloud:25909/v1/players";

  try {
    const response = await fetch(PLAN_API_URL);
    if (!response.ok) {
      throw new Error(`Plan API responded with status ${response.status}`);
    }

    const data = await response.json();
    const playersArray = data.players || [];

    const formatted = playersArray.map(p => {
      let rawVal = 0;

      if (type === 'balance') {
        const balString = String(p.Balance || "0").replace(/[^0-9.-]+/g, "");
        rawVal = parseFloat(balString) || 0;
      } else if (type === 'playtime') {
        // Reads PlaceholderAPI total ticks or falls back to Active Playtime
        const ticks = p["%statistic_time_played%"] || p.TotalTicks;
        if (ticks) {
          rawVal = Math.floor(Number(ticks) / 20);
        } else {
          rawVal = Math.floor((Number(p["Active Playtime"]) || 0) / 1000);
        }
      } else if (type === 'kills') {
        rawVal = Number(p["%statistic_player_kills%"] || p.Kills || 0);
      } else if (type === 'deaths') {
        rawVal = Number(p["%statistic_deaths%"] || p.Deaths || 0);
      }

      return {
        name: p.Name || p.name || "Unknown",
        value: rawVal
      };
    });

    formatted.sort((a, b) => b.value - a.value);
    const top10 = formatted.slice(0, 10);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.status(200).json(top10);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
