export default async function handler(req, res) {
  const { type = 'balance', debug = 'false' } = req.query;
  const PLAN_API_URL = "http://n6.ozima.cloud:25909/v1/players";

  try {
    const response = await fetch(PLAN_API_URL, {
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Plan HTTP Error: ${response.status}`);
    }

    const data = await response.json();

    // If &debug=true is in the URL, return raw Plan data to inspect keys
    if (debug === 'true') {
      return res.status(200).json(data);
    }

    // Handle array directly or any nested object array (players, data, rows, etc.)
    let list = [];
    if (Array.isArray(data)) {
      list = data;
    } else if (typeof data === 'object' && data !== null) {
      list = data.players || data.data || data.rows || Object.values(data).find(v => Array.isArray(v)) || [];
    }

    const formatted = list.map(p => {
      let rawVal = 0;

      if (type === 'balance') {
        const balString = String(p.Balance || p.balance || "0").replace(/[^0-9.-]+/g, "");
        rawVal = parseFloat(balString) || 0;
      } else if (type === 'playtime') {
        // Fallback checks for milliseconds or ticks
        const ticks = p["%statistic_time_played%"] || p.TotalTicks || p.time_played;
        if (ticks) {
          rawVal = Math.floor(Number(ticks) / 20);
        } else {
          rawVal = Math.floor((Number(p["Active Playtime"] || p["Active playtime"] || p.active_playtime || p.playtime) || 0) / 1000);
        }
      } else if (type === 'kills') {
        rawVal = Number(p["%statistic_player_kills%"] || p.Kills || p.kills || 0);
      } else if (type === 'deaths') {
        rawVal = Number(p["%statistic_deaths%"] || p.Deaths || p.deaths || 0);
      }

      return {
        name: p.Name || p.name || p.player_name || "Unknown",
        value: isNaN(rawVal) ? 0 : rawVal
      };
    });

    formatted.sort((a, b) => b.value - a.value);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).json(formatted.slice(0, 10));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
