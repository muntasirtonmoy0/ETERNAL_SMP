export default async function handler(req, res) {
  try {
    const response = await fetch("http://n6.ozima.cloud:25909/v1/players");
    if (!response.ok) {
      throw new Error(`Plan server returned status: ${response.status}`);
    }
    const rawData = await response.json();

    // Extract actual player records from Plan's response schema
    let players = [];
    if (Array.isArray(rawData)) {
      players = rawData;
    } else if (rawData.players && Array.isArray(rawData.players)) {
      players = rawData.players;
    } else if (rawData.players && typeof rawData.players === "object") {
      players = Object.entries(rawData.players).map(([uuid, info]) => ({
        uuid,
        ...(typeof info === "object" ? info : { name: info })
      }));
    } else if (typeof rawData === "object" && rawData !== null) {
      players = Object.entries(rawData)
        .filter(([key, val]) => typeof val === "object" && val !== null && (val.name || val.player_name || val.uuid))
        .map(([uuid, info]) => ({ uuid, ...info }));
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate");
    res.status(200).json(players);
  } catch (error) {
    res.status(500).json({ error: "Failed to connect to Plan Webserver" });
  }
}
