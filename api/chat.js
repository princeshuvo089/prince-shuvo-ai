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

    const contents = (messages || []).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // গুগলের বর্তমান সক্রিয় ও দ্রুততম মডেলগুলোর তালিকা (অটো-ফলব্যাক)
    const availableModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-flash-latest',
      'gemini-2.5-flash-lite'
    ];

    let finalReply = null;
    let errorDetail = null;

    // যেকোনো একটি সক্রিয় মডেল পাওয়া মাত্রই উত্তর নিয়ে আসবে
    for (const model of availableModels) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
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

        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          finalReply = data.candidates[0].content.parts[0].text;
          break; // সফলভাবে উত্তর পাওয়া গেলে লুপ শেষ
        } else if (data.error) {
          errorDetail = data.error.message;
        }
      } catch (err) {
        errorDetail = err.message;
      }
    }

    if (finalReply) {
      return res.status(200).json({ reply: finalReply });
    } else {
      return res.status(400).json({ error: errorDetail || 'গুগল এআই থেকে উত্তর পাওয়া যায়নি।' });
    }

  } catch (error) {
    return res.status(500).json({ error: 'সার্ভারে সাময়িক সমস্যা হয়েছে।' });
  }
}
