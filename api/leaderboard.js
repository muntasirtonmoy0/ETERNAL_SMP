export default async function handler(req, res) {
  const { type = 'balance' } = req.query;
  const PLAN_BASE_URL = "http://n6.ozima.cloud:25909";

  try {
    // 1. Fetch main player list
    const response = await fetch(`${PLAN_BASE_URL}/v1/players`, {
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

    // Extract player name & clean UUID from Plan's HTML anchor tag
    const players = rawList.map(item => {
      let cleanName = "Unknown";
      let uuid = null;

      if (typeof item.name === "string") {
        cleanName = item.name.replace(/<[^>]*>?/gm, "").trim();
        const match = item.name.match(/player\/([a-zA-Z0-9-]+)/);
        if (match) uuid = match[1];
      }

      return {
        name: cleanName,
        uuid: uuid,
        balance: parseNumericValue(item.balance?.v ?? item.balance?.d ?? 0),
        playtime: Math.floor(parseNumericValue(item.activePlaytime?.v ?? item.playtime?.v ?? 0) / 1000)
      };
    });

    let formatted = [];

    // 2. Handle Balance and Playtime directly from table data (super fast)
    if (type === 'balance') {
      formatted = players.map(p => ({ name: p.name, value: p.balance }));
    } else if (type === 'playtime') {
      formatted = players.map(p => ({ name: p.name, value: p.playtime }));
    } 
    // 3. For Kills and Deaths, fetch player-specific combat data in parallel
    else if (type === 'kills' || type === 'deaths') {
      formatted = await Promise.all(
        players.map(async (p) => {
          if (!p.uuid) return { name: p.name, value: 0 };

          try {
            const pRes = await fetch(`${PLAN_BASE_URL}/v1/player/${p.uuid}`, {
              headers: { "Accept": "application/json" }
            });

            if (!pRes.ok) return { name: p.name, value: 0 };
            const pData = await pRes.json();

            let val = 0;
            if (type === 'kills') {
              val = pData.player_kills ?? pData.playerKills ?? pData.kills ?? pData.mob_kills ?? 0;
            } else if (type === 'deaths') {
              val = pData.deaths ?? pData.player_deaths ?? pData.playerDeaths ?? 0;
            }

            return {
              name: p.name,
              value: parseNumericValue(val)
            };
          } catch {
            return { name: p.name, value: 0 };
          }
        })
      );
    }

    // Sort descending (highest first)
    formatted.sort((a, b) => b.value - a.value);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).json(formatted.slice(0, 10));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
