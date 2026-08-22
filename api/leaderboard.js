export default async function handler(req, res) {
  const { type = 'balance' } = req.query;
  const BYTEBIN_ID = "p2qTjzlsFmhykiEk";
  const BYTEBIN_URL = `https://bytebin.ajg0702.us/${BYTEBIN_ID}`;

  // Mapping tab query types to ajLeaderboards board keys
  const boardMap = {
    balance: 'vault_eco_balance',
    playtime: 'statistic_hours_played',
    kills: 'statistic_player_kills',
    deaths: 'statistic_deaths'
  };

  const targetBoard = boardMap[type] || 'vault_eco_balance';

  try {
    const response = await fetch(BYTEBIN_URL, {
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Viewer fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const boards = data.boards || {};
    const selectedBoard = boards[targetBoard] || {};
    const entries = selectedBoard.alltime || selectedBoard.entries || [];

    const formatted = entries.map(item => {
      let rawVal = parseFloat(item.value || item.score || 0) || 0;

      if (type === 'playtime') {
        // Convert hours to seconds so app.js formats it cleanly (e.g. 3h 0m)
        rawVal = rawVal * 3600;
      }

      return {
        name: item.player_name || item.name || item.player || "Unknown",
        value: isNaN(rawVal) ? 0 : rawVal
      };
    });

    // Sort descending (highest first)
    formatted.sort((a, b) => b.value - a.value);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).json(formatted.slice(0, 10));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
