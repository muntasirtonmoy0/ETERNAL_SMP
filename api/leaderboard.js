export default async function handler(req, res) {
  const { type = 'balance' } = req.query;
  const PLAN_API_URL = "http://n6.ozima.cloud:25909/v1/players";

  try {
    const response = await fetch(PLAN_API_URL, {
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Plan HTTP Error: ${response.status}`);
    }

    const payload = await response.json();
    const rawList = payload.data || [];

    const formatted = rawList.map(item => {
      // 1. Strip HTML tags from Plan's anchor string to extract pure Minecraft name
      let cleanName = "Unknown";
      if (typeof item.name === "string") {
        cleanName = item.name.replace(/<[^>]*>?/gm, "").trim();
      }

      // 2. Extract nested numeric values
      let rawVal = 0;

      if (type === 'balance') {
        if (item.balance && item.balance.v !== undefined && item.balance.v !== "-") {
          rawVal = parseFloat(item.balance.v) || 0;
        }
      } else if (type === 'playtime') {
        // Active playtime stored in milliseconds; convert to seconds
        if (item.activePlaytime && item.activePlaytime.v !== undefined && item.activePlaytime.v !== "-") {
          rawVal = Math.floor(Number(item.activePlaytime.v) / 1000);
        }
      } else if (type === 'kills') {
        if (item.kills && item.kills.v !== undefined && item.kills.v !== "-") {
          rawVal = Number(item.kills.v) || 0;
        }
      } else if (type === 'deaths') {
        if (item.deaths && item.deaths.v !== undefined && item.deaths.v !== "-") {
          rawVal = Number(item.deaths.v) || 0;
        }
      }

      return {
        name: cleanName,
        value: isNaN(rawVal) ? 0 : rawVal
      };
    });

    // Sort highest to lowest
    formatted.sort((a, b) => b.value - a.value);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).json(formatted.slice(0, 10));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
