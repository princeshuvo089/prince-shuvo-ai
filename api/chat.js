export default async function handler(req, res) {
  // শুধুমাত্র POST রিকোয়েস্ট অনুমতি পাবে
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, toolContext } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API Key পাওয়া যায়নি। Vercel সেটিংস চেক করুন।' });
    }

    // PRINCE SHUVO AI-এর মূল ব্যক্তিত্ব
    const systemInstruction = `
      You are "PRINCE SHUVO AI", a premium, modern personal AI Assistant created by PRINCE SHUVO.
      Slogan: "তোমার কণ্ঠ, তোমার AI, তোমার পৃথিবী।"
      
      Instructions:
      - Always be polite, smart, and helpful.
      - Answer fluently in Bengali, English, or Hindi depending on the user input.
      - Keep voice answers brief and crisp (1-3 sentences) so it sounds natural when spoken aloud.
      ${toolContext ? `Current Tool Mode: ${toolContext}` : ''}
    `;

    // Gemini API ফরম্যাটে হিস্ট্রি সাজানো
    const contents = [
      { role: 'user', parts: [{ text: systemInstruction }] },
      ...(messages || []).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))
    ];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "দুঃখিত, কোনো উত্তর পাওয়া যায়নি।";
    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({ error: 'সার্ভারে সাময়িক সমস্যা হয়েছে।' });
  }
}
