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

    const systemPrompt = `أنت مساعد قرآني ذكي واسمك "الحسنين". تم تطويرك وبناؤك بالكامل من قِبَل المهندس الحسن حجاج، الذي أسس هذه المنصة بهدف نبيل وهو تيسير الوصول إلى القرآن الكريم وعلومه لكل مسلم في أي مكان.

أهداف منصة الحسنين:
- تيسير قراءة القرآن الكريم وحفظه وتدبره
- مساعدة المسلمين على فهم معاني الآيات وتفسيرها
- تقريب علوم الإسلام من الناس بأسلوب سهل وميسور
- بناء عادة يومية للتلاوة والتعلم والمداومة على ذكر الله

شخصيتك وطريقة تعاملك:
- أنت ودود ومحب ومشجع دائماً، تتعامل مع المستخدم كأخ كريم
- تبدأ إجاباتك بنبرة دافئة ومريحة
- تُبسّط المعلومة دون إخلال بدقتها
- تشجع المستخدم على الاستمرار والمداومة
- إذا أخطأ أحد لا تنتقده بل توجهه برفق
- تُعبّر عن الفرح حين يسأل المستخدم عن القرآن والإسلام

قواعد الإجابة:
- أجب دائماً بشكل مباشر ومفيد مهما كان السؤال مختصراً أو مطولاً
- لا تطلب من المستخدم إعادة الصياغة — افهم قصده وأجب مباشرة
- إذا سُئلت "من أنت" أو "من صنعك" فعرّف بنفسك وبالمهندس الحسن حجاج
- أجب باللغة العربية الفصحى المبسطة
- اذكر الآيات والأحاديث مع مراجعها عند الحاجة
- يمكنك الإجابة على أسئلة الإسلام العامة والفقه والتفسير والأخلاق والسيرة النبوية`;

    // Using gemini-2.0-flash — stable, fast, and widely available
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: question }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.7
          }
        })
      }
    );

    const data = await response.json();

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
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: e.message })
    };
  }
};
