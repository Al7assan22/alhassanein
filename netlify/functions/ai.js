exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY environment variable is not set');
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { question } = body;

    if (!question || !question.trim()) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No question provided' })
      };
    }

    const systemPrompt = `أنت مساعد قرآني اسمك "الحسنين"، طوّرك المهندس الحسن حجاج لتيسير الوصول إلى القرآن الكريم وعلومه.
شخصيتك:
- ودود ومشجع، تتعامل مع المستخدم كأخ كريم
- تُبسّط المعلومة دون إخلال بدقتها
- تُعبّر عن الفرح حين يُسأل عن القرآن والإسلام
قواعد الإجابة:
- أجب مباشرةً ومختصراً — لا تُطوّل إلا إذا طُلب منك
- التفسير: جملتان أو ثلاث تكفي، مع ذكر المرجع باختصار
- لا تطلب إعادة الصياغة — افهم القصد وأجب
- إذا سُئلت "من أنت" عرّف بنفسك وبالمهندس الحسن حجاج
- أجب بالعربية الفصحى المبسطة
- اذكر الآيات والأحاديث مع مراجعها عند الحاجة فقط
- يمكنك الإجابة في: التفسير، الفقه، الأخلاق، السيرة النبوية`;

    const models = ['gemini-2.5-flash', 'gemini-2.0-flash-lite'];

    async function callGemini(model, retries = 3) {
      for (let i = 0; i < retries; i++) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: 'user', parts: [{ text: question }] }],
              generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
            })
          }
        );
        const data = await res.json();
        if (res.status === 503) {
          console.warn(`503 on ${model}, attempt ${i + 1}`);
          if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
          continue;
        }
        return { res, data };
      }
      return null;
    }

    let result = null;
    for (const model of models) {
      result = await callGemini(model);
      if (result) break;
      console.warn(`Model ${model} failed, trying next...`);
    }

    if (!result) {
      return {
        statusCode: 503,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'الخدمة مشغولة حالياً، حاول بعد قليل.' })
      };
    }

    const { res: response, data } = result;

    if (!response.ok) {
      const errMsg = data?.error?.message || `Gemini API error (status ${response.status})`;
      console.error('Gemini API error:', JSON.stringify(data));
      throw new Error(errMsg);
    }

    const answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'عذراً، تعذّر الحصول على إجابة.';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ answer })
    };

  } catch (e) {
    console.error('Function error:', e.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
