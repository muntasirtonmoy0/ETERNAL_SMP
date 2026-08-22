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

    // Helper to parse strings like "9.9B", "150M", "$2.5K", or raw numbers
    function parseFormattedNumber(val) {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') return val;

      const str = String(val).trim().toUpperCase();
      const numMatch = str.match(/[-+]?[0-9]*\.?[0-9]+/);
      if (!numMatch) return 0;

      let num = parseFloat(numMatch[0]);
      if (str.includes('B')) num *= 1e9;
      else if (str.includes('M')) num *= 1e6;
      else if (str.includes('K')) num *= 1e3;

      return isNaN(num) ? 0 : num;
    }

    const formatted = rawList.map(item => {
      // 1. Strip HTML tags from username
      let cleanName = "Unknown";
      if (typeof item.name === "string") {
        cleanName = item.name.replace(/<[^>]*>?/gm, "").trim();
      }

      let rawVal = 0;

      if (type === 'balance') {
        const bal = item.balance?.d ?? item.balance?.v ?? item.balance ?? 0;
        rawVal = parseFormattedNumber(bal);

      } else if (type === 'playtime') {
        // Active playtime: item.activePlaytime.v is milliseconds
        const ms = item.activePlaytime?.v ?? item.playtime?.v ?? 0;
        rawVal = Math.floor((Number(ms) || 0) / 1000); // Return in seconds

      } else if (type === 'kills') {
        // Plan's native kills structure
        const kills = item.kills?.v ?? item.kills?.d ?? item.playerKills?.v ?? item.kills ?? 0;
        rawVal = Number(kills) || 0;

      } else if (type === 'deaths') {
        // Plan's native deaths structure
        const deaths = item.deaths?.v ?? item.deaths?.d ?? item.playerDeaths?.v ?? item.deaths ?? 0;
        rawVal = Number(deaths) || 0;
      }

      return {
        name: cleanName,
        value: isNaN(rawVal) ? 0 : rawVal
      };
    });

    // Sort descending (highest rank first)
    formatted.sort((a, b) => b.value - a.value);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).json(formatted.slice(0, 10));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
