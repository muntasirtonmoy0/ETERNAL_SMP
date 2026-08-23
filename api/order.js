export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Paste your Discord Webhook URL here
  const DISCORD_WEBHOOK_URL = "YOUR_DISCORD_WEBHOOK_URL_HERE";

  const { rank, price, ign, realName, email, contact, address, senderNum, trxId } = req.body;

  const discordPayload = {
    username: "Eternal SMP Store",
    avatar_url: "https://eternal-smp-fun.vercel.app/logo.png",
    embeds: [
      {
        title: `🛒 New Rank Purchase: ${rank}`,
        color: 0x00d2ff,
        fields: [
          { name: "🎮 In-Game Name (IGN)", value: `\`${ign}\``, inline: true },
          { name: "💰 Price Paid", value: `৳${price} BDT`, inline: true },
          { name: "📜 Rank Selected", value: rank, inline: true },
          { name: "💳 Sender Phone", value: `\`${senderNum}\``, inline: true },
          { name: "🔑 TrxID", value: `\`${trxId}\``, inline: true },
          { name: "👤 Real Name", value: realName, inline: true },
          { name: "📧 Email", value: email, inline: true },
          { name: "📱 Contact / WA", value: contact, inline: true },
          { name: "📍 Delivery Region", value: address, inline: false }
        ],
        footer: { text: "Eternal SMP Store System" },
        timestamp: new Date().toISOString()
      }
    ]
  };

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload)
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
