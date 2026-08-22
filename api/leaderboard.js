export default async function handler(req, res) {
  const { type = 'balance' } = req.query;
  const PLAN_BASE_URL = "http://n6.ozima.cloud:25909";

  try {
    // 1. Fetch the master players list
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

    // Extract cleaned name and UUID from the player anchor tag
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

    // Fast resolution for Balance and Playtime from table data
    if (type === 'balance') {
      formatted = players.map(p => ({ name: p.name, value: p.balance }));
    } else if (type === 'playtime') {
      formatted = players.map(p => ({ name: p.name, value: p.playtime }));
    } 
    // Fetch deaths / kills via Plan's /v1/datapoint API
    else if (type === 'deaths' || type === 'kills') {
      const metricKey = type === 'deaths' ? 'player_deaths' : 'player_kills';

      formatted = await Promise.all(
        players.map(async (p) => {
          if (!p.uuid) return { name: p.name, value: 0 };

          try {
            const dataUrl = `${PLAN_BASE_URL}/v1/datapoint?type=${metricKey}&player=${p.uuid}`;
            const pRes = await fetch(dataUrl, {
              headers: { "Accept": "application/json" }
            });

            if (!pRes.ok) return { name: p.name, value: 0 };
            const json = await pRes.json();

            // Value can be direct number, nested object, or an array entry
            let val = 0;
            if (typeof json === 'number') {
              val = json;
            } else if (json && typeof json === 'object') {
              val = json.value ?? json.v ?? json[metricKey] ?? json.result ?? 0;
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

    // Sort descending (highest rank first)
    formatted.sort((a, b) => b.value - a.value);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).json(formatted.slice(0, 10));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
