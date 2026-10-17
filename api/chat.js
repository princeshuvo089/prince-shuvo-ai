export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, toolContext, language = 'bn' } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API Key অনুপস্থিত। Vercel এনভায়রনমেন্ট ভেরিয়েবল চেক করুন।' });
    }

    // PRINCE SHUVO AI-এর এক্সিকিউটিভ ব্যক্তিত্ব ও সিস্টেম প্রম্পট
    const systemPrompt = `
You are "PRINCE SHUVO AI", an elite, world-class futuristic Personal AI Assistant created by PRINCE SHUVO.
Slogan: "Your Voice. Your AI. Your World." ("তোমার কণ্ঠ, তোমার AI, তোমার পৃথিবী।")

Personality & Rules:
1. Sophisticated, intelligent, warm, polite, and executive.
2. Primary languages: Bengali, English, and Hindi. Respond in the exact language the user used.
3. For voice conversations, keep answers concise (2 to 3 sentences maximum) and natural for Speech Synthesis.
4. For text chat, format your output with clean Markdown, bold headers, and structured code blocks where applicable.
5. Always respect your creator: PRINCE SHUVO.
${toolContext ? `ACTIVE TOOL MODE: ${toolContext}` : ''}
    `;

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
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
    return res.status(500).json({ error: 'সার্ভারে সাময়িক সমস্যা দেখা দিয়েছে।' });
  }
}
