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
      // 1. Strip HTML tags to get the pure username
      let cleanName = "Unknown";
      if (typeof item.name === "string") {
        cleanName = item.name.replace(/<[^>]*>?/gm, "").trim();
      }

      // 2. Extract values safely
      let rawVal = 0;

      if (type === 'balance') {
        const bal = item.balance?.d ?? item.balance?.v ?? "0";
        rawVal = parseFloat(String(bal).replace(/[^0-9.-]+/g, "")) || 0;
      } else if (type === 'playtime') {
        // Active playtime: item.activePlaytime.v is milliseconds
        const ms = item.activePlaytime?.v ?? "0";
        rawVal = Math.floor((Number(ms) || 0) / 1000); // return in seconds
      } else if (type === 'kills') {
        const kills = item.kills?.v ?? item.kills?.d ?? 0;
        rawVal = Number(kills) || 0;
      } else if (type === 'deaths') {
        const deaths = item.deaths?.v ?? item.deaths?.d ?? 0;
        rawVal = Number(deaths) || 0;
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
