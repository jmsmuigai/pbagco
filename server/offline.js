import { ORG } from './content.js';

// Keyword fallback so the bot still helps (kindly) if Gemini is unreachable.
export function offlineAnswer(q) {
  const s = ' ' + String(q).toLowerCase() + ' ';
  const hit = (...w) => w.some((x) => s.includes(x));
  if (hit('hello', 'hi ', 'habari', 'hey', 'niaje', 'mambo', 'good morning', 'good evening')) return { text: 'Karibu sana! 😊 this is Ask PBAG, PBAG\'s AI assistant. I can help with tickets, shows, auditions, hiring PBAG or our AI and events services. What would you like to do today?' };
  if (hit('ticket', 'buy', 'price', 'paybill', 'm-pesa', 'mpesa', 'pay ', 'payment', 'lipa', 'tiketi', 'bei', 'how much')) return { text: 'Tickets for *Ithaka cia Kamĩrĩĩthũ* (17–20 December, Kamirithu Polytechnic, Limuru) are sold by our ticketing partner: [Buy tickets on Ticketvort](https://ticketvort.com/event-ticketing/ithaka-cia-kamirithu/?show=2). Early Access KES 1,000 until 20 Nov · Advance KES 1,500 until 13 Dec · Gate KES 2,000. You pay on Ticketvort, not here.' };
  if (hit('lost', 'download', 'resend', 'my ticket', 'refund')) return { text: 'Tickets are issued by Ticketvort — check the email or SMS they sent you, or their support page. For anything about the show itself, call or WhatsApp 0720 960 180 and the team will help.' };
  if (hit('show', 'event', 'what\'s on', 'whats on', 'calendar', 'when')) return { text: 'Now booking: *Ithaka cia Kamĩrĩĩthũ* — Thu 17 & Fri 18 Dec at 5pm, Sat 19 & Sun 20 Dec at 3pm and 6pm, Kamirithu Polytechnic, Limuru. See [What\'s on](/tickets), read [the story](/ithaka) or [buy tickets on Ticketvort](https://ticketvort.com/event-ticketing/ithaka-cia-kamirithu/?show=2).' };
  if (hit('audition', 'casting', 'join', 'talent', 'act ', 'actor', 'perform')) return { text: 'We\'d love to see your talent! 🌟 Open calls, alerts and online applications are on the [Auditions page](/auditions). You can also join a subsidiary via [Subsidiaries](/subsidiaries).' };
  if (hit('hire', 'book', 'workshop', 'mc ', 'corporate', 'event management', 'pr ')) return { text: 'Wonderful — pick a service and a free date on [Book Us](/book), or see corporate services on [PBAG Events](/events). The team confirms within a working day.' };
  if (hit('language', 'nlp', 'kiswahili', 'gikuyu', 'kikuyu language', 'african language')) return { text: 'PBAG is building language technology for African languages — Gĩkũyũ, Kiswahili and Sheng — with communities. See [PBAG NLP](/nlp).' };
  if (hit(' ai', 'gemini', 'consult', 'artificial', 'film', 'veo', 'nano banana')) return { text: 'PBAG uses Google AI tools for theatre and film and offers training and consultancy — see [AI in Theatre & Film](/ai-film) or book a free call on [Book Us](/book?service=ai).' };
  if (hit('history', 'ithaka', 'kamiriithu', 'kamirithu', 'lari', 'mau mau', 'ngugi', 'chief', 'mukoma')) return { text: 'The history of Kamĩrĩĩthũ and Limuru — from Gĩkũyũ and Mũmbi to the Lari Massacre and Ngũgĩ\'s theatre — is on [Ithaka cia Kamĩrĩĩthũ](/ithaka), with a [Heritage Map](/heritage-map).' };
  if (hit('watch', 'comedy', 'video', 'youtube', 'funny')) return { text: 'Grab some popcorn 🍿 — the [Virtual Theatre](/theatre) screens PBAG originals first, then Kenyan comedy greats.' };
  if (hit('contact', 'phone', 'call', 'email', 'where', 'location')) return { text: `You can call or WhatsApp ${ORG.contact.phone}, or email ${ORG.contact.email}. Each arm has its own inbox too — theatre@, pgt@ and peatice@pbagco.com. We\'re in Limuru, Kiambu County. More on the [Contact page](/contact).` };
  if (hit('thank', 'asante')) return { text: 'Asante sana — it\'s a pleasure! Anything else I can help with? 🎭' };
  return { text: 'I\'m sorry — I don\'t have a good answer for that yet. I can pass your question to the **PBAG Board & Management** so a person can reply to you. Would you like me to do that?', escalate: true };
}

