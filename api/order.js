export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const {
    ign,
    item,
    price,
    senderPhone,
    trxId,
    realName,
    email,
    contactPhone,
    region
  } = req.body;

  // Basic validation
  if (!ign || !trxId || !senderPhone) {
    return res.status(400).json({ error: 'Missing required purchase details.' });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('DISCORD_WEBHOOK_URL environment variable is missing.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const productName = item || 'Server Item';
  const productPrice = price || '0';

  const discordPayload = {
    username: "Eternal SMP Store",
    avatar_url: "https://res.cloudinary.com/retvp8pw/image/upload/v1787541781/ETERNAL_SMP_BEGIN.png",
    embeds: [
      {
        title: `🛒 New Order: ${productName}`,
        color: 0x00d2ff,
        fields: [
          {
            name: "🎮 In-Game Name (IGN)",
            value: `\`${ign}\``,
            inline: true
          },
          {
            name: "💰 Price",
            value: `৳${productPrice} BDT`,
            inline: true
          },
          {
            name: "📦 Item / Package",
            value: productName,
            inline: true
          },
          {
            name: "📱 Sender Phone",
            value: `\`${senderPhone}\``,
            inline: true
          },
          {
            name: "🔑 TrxID",
            value: `\`${trxId}\``,
            inline: true
          },
          {
            name: "👤 Real Name",
            value: realName || "N/A",
            inline: true
          },
          {
            name: "✉️ Email",
            value: email || "N/A",
            inline: true
          },
          {
            name: "📞 Contact / WA",
            value: contactPhone || "N/A",
            inline: true
          },
          {
            name: "📍 Delivery Region",
            value: region || "N/A",
            inline: true
          }
        ],
        footer: {
          text: "Eternal SMP Store System"
        },
        timestamp: new Date().toISOString()
      }
    ]
  };

  try {
    const discordResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(discordPayload)
    });

    if (!discordResponse.ok) {
      const errText = await discordResponse.text();
      console.error('Discord Webhook Error:', errText);
      return res.status(502).json({ error: 'Failed to dispatch notification to Discord.' });
    }

    return res.status(200).json({ success: true, message: 'Order submitted successfully.' });
  } catch (error) {
    console.error('Error sending order webhook:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
