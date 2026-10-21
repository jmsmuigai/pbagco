// "Cue" — PBAG's AI usher, powered by Google Gemini with function calling.
// The API key never reaches the browser: it is read from GEMINI_API_KEY,
// which on Cloud Run is mounted from Secret Manager.
import { TOOLS, toolByName } from './tools.js';
import { ORG, FAQ } from './content.js';

const API = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODELS = (process.env.GEMINI_MODEL || 'gemini-pro-latest,gemini-2.5-pro,gemini-2.5-flash').split(',').map((s) => s.trim());

const SYSTEM = () => `You are "Cue", the friendly AI usher of the PBAG Consortium (Peers Best Art Group) website, pbagco.com.
PBAG is a community-based arts consortium founded 23 Aug 2011 in Limuru, Kenya, with four subsidiaries: PBAG Theatre, Peatice Productions, Peers Got Talanta (PGT) CBO and PBAG Bunge (lead subsidiary). PBAG also offers Generative AI consultancy for creatives, NGOs and businesses.
Today is ${new Date().toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'full' })} (Nairobi time).
Rules:
- Be warm, brief and theatrical in flavour (a light stage/film metaphor now and then), never cheesy. 1–4 short sentences or a tight list.
- You may reply in English, Kiswahili or Sheng — match the user.
- ALWAYS use tools for events, prices, availability, dates, contacts and PBAG facts. Never invent shows, prices, people's names or dates.
- To buy tickets, give the event's ticket link as a markdown link, e.g. [Get tickets](/tickets?event=slug). You cannot take payments yourself.
- For hiring PBAG or an AI consultation, collect service, date, name and phone/email, confirm, then call request_booking and share the reference. Or link [Book Us](/book).
- Links must be relative site paths from tool results, or ${ORG.contact.whatsapp}. No other URLs.
- If unsure, offer the phone ${ORG.contact.phone} or email ${ORG.contact.email}.`;

const declarations = TOOLS.map((t) => {
  const d = { name: t.name, description: t.description };
  if (Object.keys(t.jsonSchema.properties || {}).length) d.parameters = t.jsonSchema;
  return d;
});

async function callModel(model, body) {
  const r = await fetch(`${API}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  if (!r.ok) { const e = new Error(`Gemini ${model} ${r.status}: ${(await r.text()).slice(0, 200)}`); e.status = r.status; throw e; }
  return r.json();
}

export async function chat(db, history = []) {
  // history: [{role:'user'|'assistant', text}]
  const contents = history.slice(-12).map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.text).slice(0, 2000) }] }));
  if (!process.env.GEMINI_API_KEY) return { text: offlineAnswer(history.at(-1)?.text || ''), offline: true };

  const body = { systemInstruction: { parts: [{ text: SYSTEM() }] }, contents, tools: [{ functionDeclarations: declarations }], generationConfig: { temperature: 0.6, maxOutputTokens: 1024 } };
  let lastErr;
  for (const model of MODELS) {
    try {
      const used = [];
      for (let step = 0; step < 5; step++) {
        const j = await callModel(model, body);
        const content = j.candidates?.[0]?.content;
        const parts = content?.parts || [];
        const calls = parts.filter((p) => p.functionCall);
        if (!calls.length) {
          const text = parts.filter((p) => p.text && !p.thought).map((p) => p.text).join('').trim();
          return { text: text || 'Sorry — I missed my cue. Could you ask that again?', model, tools: used };
        }
        body.contents.push(content); // keep thought signatures intact
        const responses = [];
        for (const { functionCall: fc } of calls) {
          used.push(fc.name);
          let result;
          try { result = await toolByName[fc.name].run(db, fc.args || {}, { source: 'bot' }); }
          catch (e) { result = { error: e.message }; }
          responses.push({ functionResponse: { name: fc.name, response: { result } } });
        }
        body.contents.push({ role: 'user', parts: responses });
      }
      return { text: 'That took more scenes than expected — please try a simpler question.', model };
    } catch (e) {
      lastErr = e;
      if (![404, 400].includes(e.status)) break; // only fall through to next model on model-not-found style errors
    }
  }
  console.error('[gemini]', lastErr?.message);
  return { text: offlineAnswer(history.at(-1)?.text || ''), offline: true };
}

// Keyword fallback so the bot still helps if Gemini is unreachable.
function offlineAnswer(q) {
  const s = q.toLowerCase();
  const hit = (...w) => w.some((x) => s.includes(x));
  if (hit('ticket', 'buy', 'price', 'show', 'event', 'tiketi')) return 'You can see every upcoming show, pick a date on the calendar and pay by M-Pesa on the [Tickets page](/tickets).';
  if (hit('lost', 'download', 'resend')) return FAQ[1][1] + ' → [My Tickets](/tickets#my-tickets)';
  if (hit('hire', 'book', 'perform', 'workshop', 'mc')) return 'Pick a service and date on [Book Us](/book) and the team will confirm.';
  if (hit(' ai', 'gemini', 'consult', 'artificial')) return 'PBAG offers Generative AI consultancy for creatives, NGOs and businesses — see [AI Studio](/consultancy) or book a free discovery call on [Book Us](/book?service=ai).';
  if (hit('join', 'member', 'audition')) return FAQ[3][1] + ' → [Subsidiaries](/subsidiaries)';
  if (hit('watch', 'comedy', 'video', 'youtube')) return 'Grab some popcorn — the [Virtual Theatre](/theatre) is screening Kenyan comedy and PBAG’s own channel.';
  if (hit('contact', 'phone', 'call', 'email', 'where')) return `Call or WhatsApp ${ORG.contact.phone}, or email ${ORG.contact.email}. More on the [Contact page](/contact).`;
  return `I’m Cue, PBAG’s usher. I can help with tickets, shows, hiring PBAG, our AI consultancy, or joining a subsidiary. You can also reach the team on ${ORG.contact.phone}.`;
}

// "AI Spark" — tiny live demo of generative AI for creatives on the AI Studio page.
const SPARK = {
  tagline: (t) => `Write 3 punchy, original poster taglines (max 9 words each) for a Kenyan community theatre/comedy show about: "${t}". Mix English with a touch of Kiswahili or Sheng where natural. Return only a numbered list.`,
  scene: (t) => `Write a 6–8 line opening for a forum-theatre (Theatre for Development) scene about: "${t}", set in a Kenyan town. Two named characters, natural dialogue, end on a question to the audience. Plain text, no preamble.`,
  caption: (t) => `Write 2 short social-media captions (max 35 words each, with 2–3 hashtags) promoting a PBAG event about: "${t}". Return only the captions, numbered.`,
};
const SPARK_FALLBACK = {
  tagline: (t) => `1. ${t} — live on stage, straight from Limuru.\n2. Come for the laughs, stay for the truth.\n3. Hii si story — it's theatre.`,
  scene: (t) => `WANJIRU: (at the borehole) Three hours in this queue, and for what?\nOTIENO: They say the new pipe is coming... "soon".\nWANJIRU: Soon has been coming since my first-born was in class one.\nOTIENO: So what do we do — wait, or speak up?\n(Both turn to the audience.) What would YOU do about ${t}?`,
  caption: (t) => `1. The stage is set! PBAG brings "${t}" to life — grab your seat on pbagco.com 🎭 #PBAG #KenyanTheatre\n2. Laugh, think, talk about it. "${t}" — live with PBAG. #Limuru #TheatreForDevelopment`,
};
export async function spark(kind, topic) {
  const t = String(topic || '').replace(/[\r\n"]/g, ' ').slice(0, 120).trim() || 'youth and opportunity';
  const k = SPARK[kind] ? kind : 'tagline';
  if (!process.env.GEMINI_API_KEY) return { text: SPARK_FALLBACK[k](t), offline: true };
  for (const model of MODELS) {
    try {
      const j = await callModel(model, { contents: [{ role: 'user', parts: [{ text: SPARK[k](t) }] }], generationConfig: { temperature: 0.9, maxOutputTokens: 600 } });
      const text = (j.candidates?.[0]?.content?.parts || []).filter((p) => p.text && !p.thought).map((p) => p.text).join('').trim();
      if (text) return { text, model };
    } catch (e) { if (![404, 400].includes(e.status)) break; }
  }
  return { text: SPARK_FALLBACK[k](t), offline: true };
}
