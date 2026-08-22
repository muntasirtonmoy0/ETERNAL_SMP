export default async function handler(req, res) {
  const { type = 'balance' } = req.query;
  const BYTEBIN_ID = "p2qTjzlsFmhykiEk";
  const BYTEBIN_URL = `https://bytebin.ajg0702.us/${BYTEBIN_ID}`;

  // Mapping tab query types to potential board names
  const boardKeys = {
    balance: ['vault_eco_balance', 'balance', 'eco_balance', 'money'],
    playtime: ['statistic_hours_played', 'statistic_time_played', 'hours_played', 'playtime'],
    kills: ['statistic_player_kills', 'player_kills', 'kills'],
    deaths: ['statistic_deaths', 'deaths']
  };

  const targetKeys = boardKeys[type] || ['vault_eco_balance'];

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
    let entries = [];

    // Helper to find the correct board regardless of nested json structure
    function findBoardData(json) {
      if (!json) return [];

      // Structure 1: json.boards[boardName]
      const boards = json.boards || json.data || json;

      for (const key of targetKeys) {
        if (boards[key]) {
          const b = boards[key];
          if (Array.isArray(b)) return b;
          if (Array.isArray(b.alltime)) return b.alltime;
          if (Array.isArray(b.entries)) return b.entries;
          if (Array.isArray(b.data)) return b.data;
          if (Array.isArray(b.top)) return b.top;
          if (typeof b === 'object') {
            return Object.values(b);
          }
        }
      }

      // Structure 2: top-level array
      if (Array.isArray(json)) {
        return json.filter(item => targetKeys.includes(item.board || item.type || item.name));
      }

      return [];
    }

    entries = findBoardData(data);

    const formatted = entries.map(item => {
      let name = item.player_name || item.name || item.player || item.username || "Unknown";
      let rawVal = parseFloat(item.value ?? item.score ?? item.amount ?? item.v ?? 0) || 0;

      if (type === 'playtime') {
        // If ajlb is exporting time in ticks or seconds vs hours
        if (rawVal > 100000) {
          rawVal = Math.floor(rawVal / 20); // ticks -> seconds
        } else if (rawVal <= 500) {
          rawVal = rawVal * 3600; // hours -> seconds
        }
      }

      return {
        name: name,
        value: isNaN(rawVal) ? 0 : rawVal
      };
    }).filter(p => p.name !== "Unknown");

    // Sort descending
    formatted.sort((a, b) => b.value - a.value);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).json(formatted.slice(0, 10));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
