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

    function parseNumericValue(val) {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') return val;
      const str = String(val).trim();
      const num = Number(str.replace(/[^0-9.eE+-]/g, ""));
      return isNaN(num) ? 0 : num;
    }

    const formatted = rawList.map(item => {
      // Clean HTML tags from username
      let cleanName = "Unknown";
      if (typeof item.name === "string") {
        cleanName = item.name.replace(/<[^>]*>?/gm, "").trim();
      }

      let rawVal = 0;

      if (type === 'balance') {
        const bal = item.balance?.v ?? item.balance?.d ?? item.balance ?? 0;
        rawVal = parseNumericValue(bal);

      } else if (type === 'playtime') {
        // Active playtime in seconds
        const ms = item.activePlaytime?.v ?? item.playtime?.v ?? 0;
        rawVal = Math.floor(parseNumericValue(ms) / 1000);

      } else if (type === 'kills') {
        rawVal = parseNumericValue(item.kills?.v ?? item.playerKills?.v ?? item.mobKills?.v ?? 0);

      } else if (type === 'deaths') {
        rawVal = parseNumericValue(item.deaths?.v ?? item.playerDeaths?.v ?? 0);
      }

      return {
        name: cleanName,
        value: isNaN(rawVal) ? 0 : rawVal
      };
    });

    // Sort descending (Rank #1 first)
    formatted.sort((a, b) => b.value - a.value);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).json(formatted.slice(0, 10));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
