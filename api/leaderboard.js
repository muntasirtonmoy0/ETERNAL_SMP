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
      // 1. Clean player name
      let cleanName = "Unknown";
      if (typeof item.name === "string") {
        cleanName = item.name.replace(/<[^>]*>?/gm, "").trim();
      }

      // 2. Extract metrics safely using your server's exact statistic keys
      let rawVal = 0;

      if (type === 'balance') {
        const bal = item.vault_eco_balance?.v ?? item.balance?.d ?? item.balance?.v ?? "0";
        rawVal = parseFloat(String(bal).replace(/[^0-9.-]+/g, "")) || 0;
      } else if (type === 'playtime') {
        const hours = item.statistic_hours_played?.v ?? item.statistic_time_played?.v ?? item.hours_played?.v ?? null;
        if (hours !== null) {
          rawVal = (Number(hours) || 0) * 3600; // Convert hours to seconds
        } else {
          const ms = item.playtime?.v ?? item.activePlaytime?.v ?? "0";
          rawVal = Math.floor((Number(ms) || 0) / 1000); // Convert ms to seconds
        }
      } else if (type === 'kills') {
        const kills = item.statistic_player_kills?.v ?? item.kills?.v ?? item.kills?.d ?? 0;
        rawVal = Number(kills) || 0;
      } else if (type === 'deaths') {
        const deaths = item.statistic_deaths?.v ?? item.deaths?.v ?? item.deaths?.d ?? 0;
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
