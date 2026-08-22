// Simple memory/kv cache placeholder or secret sync endpoint
let cachedData = null;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const authHeader = req.headers['authorization'];
    
    // Simple protection key
    if (authHeader !== 'Bearer ETERNAL_SECRET_KEY_123') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      global.LATEST_LEADERBOARD = body;
      return res.status(200).json({ success: true, message: 'Leaderboard updated' });
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }
  }

  // GET request returns the last synced data
  return res.status(200).json(global.LATEST_LEADERBOARD || {});
}
