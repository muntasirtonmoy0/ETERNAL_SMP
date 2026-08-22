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

    // Search top-level fields and Plan's PlaceholderAPI table
    const extractVal = (item, keys) => {
      if (!item) return null;

      // 1. Direct item keys
      for (const k of keys) {
        if (item[k] !== undefined && item[k] !== null) {
          if (typeof item[k] === 'object') {
            return item[k].v ?? item[k].d ?? item[k].value ?? null;
          }
          return item[k];
        }
      }

      // 2. Plan placeholder dictionary
      const phMap = item.placeholders || item.placeholder_values || item.extensions?.PlaceholderAPI || {};
      for (const k of keys) {
        const cleanK = k.replace(/%/g, "");
        const withPercent = `%${cleanK}%`;

        if (phMap[withPercent] !== undefined && phMap[withPercent] !== null) {
          return typeof phMap[withPercent] === 'object' 
            ? (phMap[withPercent].v ?? phMap[withPercent].d ?? phMap[withPercent].value) 
            : phMap[withPercent];
        }
        if (phMap[cleanK] !== undefined && phMap[cleanK] !== null) {
          return typeof phMap[cleanK] === 'object' 
            ? (phMap[cleanK].v ?? phMap[cleanK].d ?? phMap[cleanK].value) 
            : phMap[cleanK];
        }
      }

      return null;
    };

    const formatted = rawList.map(item => {
      let cleanName = "Unknown";
      if (typeof item.name === "string") {
        cleanName = item.name.replace(/<[^>]*>?/gm, "").trim();
      }

      let rawVal = 0;

      if (type === 'balance') {
        const bal = extractVal(item, ['vault_eco_balance', 'balance', 'money', '%vault_eco_balance%']) || "0";
        rawVal = parseFloat(String(bal).replace(/[^0-9.-]+/g, "")) || 0;

      } else if (type === 'playtime') {
        // Look directly for hours played
        const hours = extractVal(item, ['%statistic_hours_played%', 'statistic_hours_played', 'hours_played']);
        
        if (hours !== null && !isNaN(Number(hours))) {
          rawVal = Number(hours) * 3600; // Convert hours to seconds for app.js
        } else {
          const ms = extractVal(item, ['playtime', 'activePlaytime', 'active_playtime']) || "0";
          rawVal = Math.floor((Number(ms) || 0) / 1000);
        }

      } else if (type === 'kills') {
        const kills = extractVal(item, [
          '%statistic_player_kills%',
          'statistic_player_kills',
          'player_kills',
          'playerKills',
          'kills'
        ]);
        rawVal = Number(kills) || 0;

      } else if (type === 'deaths') {
        const deaths = extractVal(item, [
          '%statistic_deaths%',
          'statistic_deaths',
          'player_deaths',
          'playerDeaths',
          'deaths'
        ]);
        rawVal = Number(deaths) || 0;
      }

      return {
        name: cleanName,
        value: isNaN(rawVal) ? 0 : rawVal
      };
    });

    // Sort descending
    formatted.sort((a, b) => b.value - a.value);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).json(formatted.slice(0, 10));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
