export default async function handler(req, res) {
  const { type = 'balance' } = req.query;
  const BYTEBIN_ID = "p2qTjzlsFmhykiEk";
  const BYTEBIN_URL = `https://bytebin.ajg0702.us/${BYTEBIN_ID}`;

  // Direct mapping to your exact JSON root keys
  const boardKeyMap = {
    balance: 'vault_eco_balance',
    playtime: 'statistic_hours_played',
    kills: 'statistic_player_kills',
    deaths: 'statistic_deaths'
  };

  const targetKey = boardKeyMap[type] || 'vault_eco_balance';

  try {
    const response = await fetch(BYTEBIN_URL, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      throw new Error(`Bytebin HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const rawList = data[targetKey] || [];

    const formatted = rawList.map(item => {
      // Use clean namecache to avoid Minecraft formatting codes
      const cleanName = item.namecache || item.id || "Unknown";
      let rawVal = parseFloat(item.value ?? 0) || 0;

      if (type === 'playtime') {
        // statistic_hours_played is stored in hours (e.g. 3) -> convert to seconds for app.js
        rawVal = rawVal * 3600;
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
