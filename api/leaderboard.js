export default async function handler(req, res) {
  try {
    const response = await fetch("http://n6.ozima.cloud:25909/v1/players");
    if (!response.ok) {
      throw new Error(`Plan server status: ${response.status}`);
    }
    const raw = await response.json();
    const rawList = raw.data && Array.isArray(raw.data) ? raw.data : [];

    const cleaned = rawList.map(entry => {
      const cleanName = (entry.name || "").replace(/<[^>]*>?/gm, "").trim();

      const parseNum = (obj) => {
        if (!obj) return 0;
        if (typeof obj === "number") return obj;
        if (typeof obj === "string") return isNaN(Number(obj)) ? 0 : Number(obj);
        if (obj.v !== undefined && !isNaN(Number(obj.v))) return Number(obj.v);
        if (obj.d !== undefined && !isNaN(Number(obj.d))) return Number(obj.d);
        return 0;
      };

      return {
        name: cleanName,
        balance: parseNum(entry.balance),
        playtime: parseNum(entry.activePlaytime),
        kills: parseNum(entry.player_kills) || parseNum(entry.mob_kills) || parseNum(entry.kills),
        deaths: parseNum(entry.deaths) || parseNum(entry.player_deaths),
        sessions: parseNum(entry.sessions),
        group: (entry.group && entry.group.d) ? entry.group.d : "Member"
      };
    }).filter(p => p.name && p.name.length > 0);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate");
    res.status(200).json(cleaned);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
