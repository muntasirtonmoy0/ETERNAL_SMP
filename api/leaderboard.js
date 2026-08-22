import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  const { type = 'balance' } = req.query;

  const boardMap = {
    balance: 'vault_eco_balance',
    playtime: 'statistic_time_played',
    kills: 'statistic_player_kills',
    deaths: 'statistic_deaths'
  };

  const boardName = boardMap[type] || 'vault_eco_balance';

  let connection;
  try {
    connection = await mysql.createConnection({
      host: "n1.ozima.cloud",
      port: 3306,
      user: "u254_Ix3IlpGusiC",
      password: "PASTE_YOUR_EXACT_DATABASE_PASSWORD_HERE",
      database: "s254_stats",
      connectTimeout: 10000
    });

    const [rows] = await connection.execute(
      `SELECT player_name AS name, value 
       FROM ajlb_${boardName} 
       ORDER BY CAST(value AS DECIMAL(20,2)) DESC 
       LIMIT 10`
    );

    await connection.end();

    const formatted = rows.map(r => ({
      name: r.name,
      value: Number(r.value) || 0
    }));

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.status(200).json(formatted);

  } catch (error) {
    if (connection) await connection.end();
    res.status(500).json({ error: error.message });
  }
}
