export default async function handler(req, res) {
  // Allow cross-origin requests from the browser
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Put your real Discord Webhook URL here:
  const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1540874823964688435/Tqhk8S0sMTqMY4-gK2momNrnjfjf-nS95U9r5m-SzoGydonBqe2BBtFmAurzo8tSLc81";

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { rank, price, ign, realName, email, contact, address, senderNum, trxId } = data;

    const discordPayload = {
      username: "Eternal SMP Store",
      avatar_url: "https://eternal-smp-fun.vercel.app/logo.png",
      embeds: [
        {
          title: `🛒 New Order: ${rank || 'Rank Purchase'}`,
          color: 39423,
          fields: [
            { name: "🎮 In-Game Name (IGN)", value: `\`${ign || 'N/A'}\``, inline: true },
            { name: "💰 Price", value: `৳${price || '0'} BDT`, inline: true },
            { name: "📜 Rank", value: `${rank || 'N/A'}`, inline: true },
            { name: "📱 Sender Phone", value: `\`${senderNum || 'N/A'}\``, inline: true },
            { name: "🔑 TrxID", value: `\`${trxId || 'N/A'}\``, inline: true },
            { name: "👤 Real Name", value: `${realName || 'N/A'}`, inline: true },
            { name: "📧 Email", value: `${email || 'N/A'}`, inline: true },
            { name: "📞 Contact / WA", value: `${contact || 'N/A'}`, inline: true },
            { name: "📍 Delivery Region", value: `${address || 'N/A'}`, inline: false }
          ],
          footer: { text: "Eternal SMP Store System" },
          timestamp: new Date().toISOString()
        }
      ]
    };

    const webhookRes = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload)
    });

    if (!webhookRes.ok) {
      const errText = await webhookRes.text();
      return res.status(500).json({ error: `Discord rejected: ${errText}` });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
