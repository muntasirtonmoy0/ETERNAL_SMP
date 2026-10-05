export default async function handler(req, res) {
  const { type = 'balance', limit = 50 } = req.query;
  const SERVER_HOST = "http://160.25.5.205:4350";

  const boardMap = {
    balance: 'vault_eco_balance',
    playtime: 'statistic_hours_played',
    kills: 'statistic_player_kills',
    deaths: 'statistic_deaths'
  };

  const targetBoard = boardMap[type] || 'vault_eco_balance';
  const fetchCount = Math.min(parseInt(limit, 10) || 50, 100);

  try {
    // Fetch ranked players directly from ajLb-REST in parallel
    const requests = Array.from({ length: fetchCount }, (_, i) =>
      fetch(`${SERVER_HOST}/${targetBoard}/alltime/${i + 1}`, {
        headers: { "Accept": "application/json" }
      })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    );

    const responses = await Promise.all(requests);

    const formatted = responses
      .filter(item => item && item.playerName && item.playerName !== "---")
      .map(item => {
        let rawVal = parseFloat(item.score ?? 0) || 0;

        if (type === 'playtime') {
          rawVal = rawVal * 3600; // Convert hours to seconds
        }

        return {
          name: item.playerName,
          value: rawVal
        };
      });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");
    return res.status(200).json(formatted);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
