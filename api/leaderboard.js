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
      host: process.env.DB_HOST || "gateway01.ap-southeast-1.prod.aws.tidbcloud.com",
      port: Number(process.env.DB_PORT) || 4000,
      user: process.env.DB_USER || "vh7WBZD3LEcMtqg.root",
      password: process.env.DB_PASS || "P827Agx3pRx1QKxV",
      database: process.env.DB_NAME || "test",
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
      },
      connectTimeout: 10000
    });

    const [rows] = await connection.execute(
      `SELECT player_name AS name, value 
       FROM ajlb_${boardName} 
       ORDER BY CAST(value AS DECIMAL(20,2)) DESC 
       LIMIT 10`
    );

    await connection.end();

    const formatted = rows.map(r => {
      let raw = Number(r.value) || 0;
      if (type === 'playtime') {
        raw = Math.floor(raw / 20); // ticks -> seconds
      }
      return {
        name: r.name,
        value: raw
      };
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).json(formatted);

  } catch (error) {
    if (connection) await connection.end();
    return res.status(500).json({ error: error.message });
  }
}
