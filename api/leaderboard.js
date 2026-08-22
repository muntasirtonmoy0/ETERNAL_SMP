export default async function handler(req, res) {
  try {
    const response = await fetch("http://n6.ozima.cloud:25909/v1/players");
    if (!response.ok) {
      throw new Error(`Plan server returned status: ${response.status}`);
    }
    const data = await response.json();
    
    // Allow frontend access and return clean JSON
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to connect to Plan Webserver" });
  }
}
