export default async function handler(req, res) {
  const { type = 'balance' } = req.query;
  const BYTEBIN_URL = "https://bytebin.ajg0702.us/3n0NyosCX8mezlji";

  // Mapping tab types to ajLeaderboards board keys
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
      throw new Error(`Bytebin fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const boards = data.boards || {};
    const selectedBoard = boards[targetBoard] || {};
    const entries = selectedBoard.alltime || selectedBoard.entries || [];

    const formatted = entries.map(item => {
      let rawVal = 0;

      if (type === 'balance') {
        rawVal = parseFloat(item.value || item.score || 0) || 0;
      } else if (type === 'playtime') {
        // statistic_time_played is in Minecraft game ticks (20 ticks = 1 second)
        const ticks = Number(item.value || item.score || 0);
        rawVal = Math.floor(ticks / 20);
      } else {
        rawVal = Number(item.value || item.score || 0) || 0;
      }

      return {
        name: item.player_name || item.name || item.player || "Unknown",
        value: isNaN(rawVal) ? 0 : rawVal
      };
    });

    // Sort descending and keep top 10
    formatted.sort((a, b) => b.value - a.value);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).json(formatted.slice(0, 10));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
