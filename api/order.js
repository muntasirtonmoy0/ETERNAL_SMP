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

  const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1540874823964688435/Tqhk8S0sMTqMY4-gK2momNrnjfjf-nS95U9r5m-SzoGydonBqe2BBtFmAurzo8tSLc81";

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    const productName = data.item || data.rank || 'Server Item';
    const { price, ign, realName, email, contact, senderNum, trxId } = data;

    // --- 1. STRICT ANTI-TROLL VALIDATION CHECKS ---
    
    // Check missing fields
    if (!ign || !senderNum || !trxId) {
      return res.status(400).json({ error: "Missing required order information." });
    }

    // BD Phone Regex: Must start with 01 and contain exactly 11 digits
    const bdPhoneRegex = /^01[3-9]\d{8}$/;
    if (!bdPhoneRegex.test(senderNum.trim())) {
      return res.status(400).json({ error: "Invalid Bangladeshi sender phone number." });
    }

    // bKash/Nagad TrxID Regex: 8 to 10 alphanumeric characters only (Blocks strings like 'asccccccccc')
    const cleanTrx = trxId.trim().toUpperCase();
    const trxRegex = /^[A-Z0-9]{8,10}$/;
    if (!trxRegex.test(cleanTrx) || /^([A-Z0-9])\1+$/.test(cleanTrx)) {
      return res.status(400).json({ error: "Invalid Transaction ID format." });
    }

    // IGN Length check (Minecraft usernames are 3-16 chars)
    if (ign.trim().length < 3 || ign.trim().length > 16) {
      return res.status(400).json({ error: "Invalid Minecraft username." });
    }

    // --- 2. CONSTRUCT CLEAN DISCORD EMBED ---
    const discordPayload = {
      username: "Eternal SMP Store",
      avatar_url: "https://eternal-smp-fun.vercel.app/logo.png",
      embeds: [
        {
          title: `🛒 Verified Order: ${productName}`,
          color: 0x10B981, // Clean green
          fields: [
            { name: "🎮 In-Game Name (IGN)", value: `\`${ign.trim()}\``, inline: true },
            { name: "💰 Price", value: `৳${price || '0'} BDT`, inline: true },
            { name: "📦 Item / Package", value: `${productName}`, inline: true },
            { name: "📱 Sender Phone", value: `\`${senderNum.trim()}\``, inline: true },
            { name: "🔑 TrxID", value: `\`${cleanTrx}\``, inline: true },
            { name: "👤 Real Name", value: `${realName?.trim() || 'N/A'}`, inline: true },
            { name: "📧 Email", value: `${email?.trim() || 'N/A'}`, inline: true },
            { name: "📞 Contact / WA", value: `${contact?.trim() || 'N/A'}`, inline: true }
          ],
          footer: { text: "Eternal SMP Store Security System" },
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
