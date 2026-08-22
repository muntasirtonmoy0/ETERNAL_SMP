export default async function handler(req, res) {
  try {
    const response = await fetch("http://n6.ozima.cloud:25909/v1/players");
    if (!response.ok) {
      throw new Error(`Plan server status: ${response.status}`);
    }
    const raw = await response.json();
    const rawList = Array.isArray(raw.data) ? raw.data : [];

    const cleaned = rawList.map(entry => {
      // Strip HTML anchor wrapper: <a ...>USERNAME</a> -> USERNAME
      const cleanName = (entry.name || "").replace(/<[^>]*>?/gm, "").trim();

      const parseVal = (field) => {
        if (!field || field === "-") return 0;
        if (typeof field === "number") return field;
        if (typeof field === "string") {
          const num = Number(field);
          return isNaN(num) ? 0 : num;
        }
        if (field.v !== undefined && field.v !== "-") {
          const num = Number(field.v);
          return isNaN(num) ? 0 : num;
        }
        if (field.d !== undefined && field.d !== "-") {
          const num = Number(field.d);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      };

      return {
        name: cleanName,
        balance: parseVal(entry.balance),
        playtime: parseVal(entry.activePlaytime), // Playtime in milliseconds
        sessions: parseVal(entry.sessions),
        group: entry.primaryGroup && entry.primaryGroup.d !== "-" ? entry.primaryGroup.d : "Member"
      };
    }).filter(p => p.name && p.name.length > 0);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate");
    res.status(200).json(cleaned);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
