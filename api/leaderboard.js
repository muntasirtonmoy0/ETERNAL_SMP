export default async function handler(req, res) {
  const { type = 'balance' } = req.query;
  const PERMANENT_DATA_URL = "https://api.npoint.io/c5722521836b38966b29";

  const boardKeyMap = {
    balance: 'vault_eco_balance',
    playtime: 'statistic_hours_played',
    kills: 'statistic_player_kills',
    deaths: 'statistic_deaths'
  };

  const targetKey = boardKeyMap[type] || 'vault_eco_balance';

  try {
    const response = await fetch(PERMANENT_DATA_URL, {
      headers: {
        "Accept": "application/json",
        "Cache-Control": "no-cache"
      }
    });

    if (!response.ok) {
      throw new Error(`Data fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const rawList = data[targetKey] || [];

    const formatted = rawList.map(item => {
      const cleanName = item.namecache || item.id || "Unknown";
      let rawVal = parseFloat(item.value ?? 0) || 0;

      if (type === 'playtime') {
        rawVal = rawVal * 3600;
      }

      return {
        name: cleanName,
        value: isNaN(rawVal) ? 0 : rawVal
      };
    }).filter(p => p.name !== "Unknown");

    formatted.sort((a, b) => b.value - a.value);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).json(formatted.slice(0, 10));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
