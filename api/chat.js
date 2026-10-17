export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, toolContext, language = 'bn' } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API Key পাওয়া যায়নি। Vercel সেটিংস চেক করুন।' });
    }

    const systemPrompt = `
You are "PRINCE SHUVO AI", an elite personal AI Assistant created by PRINCE SHUVO.
Slogan: "Your Voice. Your AI. Your World." ("তোমার কণ্ঠ, তোমার AI, তোমার পৃথিবী।")

Rules:
1. Always be polite, smart, and helpful.
2. Reply fluently in Bengali, English, or Hindi depending on what language the user speaks.
3. For voice and short conversations, keep your reply crisp (1 to 3 sentences).
4. Respect your creator: PRINCE SHUVO.
${toolContext ? `Current Tool: ${toolContext}` : ''}
    `;

    // Gemini API-এর জন্য সঠিক ফরম্যাট
    const contents = (messages || []).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: contents
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "দুঃখিত, আমি বুঝতে পারিনি। আবার বলুন।";
    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({ error: 'সার্ভারে সমস্যা হয়েছে।' });
  }
}
