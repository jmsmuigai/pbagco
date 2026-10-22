import { ORG } from './content.js';

// Keyword fallback so the bot still helps (kindly) if Gemini is unreachable.
export function offlineAnswer(q) {
  const s = ' ' + String(q).toLowerCase() + ' ';
  const hit = (...w) => w.some((x) => s.includes(x));
  if (hit('hello', 'hi ', 'habari', 'hey', 'niaje', 'mambo', 'good morning', 'good evening')) return { text: 'Karibu sana! 😊 I\'m Cue, PBAG\'s robot usher. I can help with tickets, shows, auditions, hiring PBAG or our AI and events services. What would you like to do today?' };
  if (hit('paybill', 'pay bill', 'm-pesa', 'mpesa', 'pay ', 'payment', 'code', 'lipa')) return { text: 'Happy to help with payment! At checkout choose **M-Pesa Paybill**: pay to the Business Number shown, use your order number (starts with PB) as the Account Number, then paste the 10-character M-Pesa code (e.g. SJK3H5X8QP). Your QR ticket appears right away. Bank transfer works the same way. → [Tickets](/tickets)' };
  if (hit('ticket', 'buy', 'price', 'show', 'event', 'tiketi', 'bei')) return { text: 'Lovely — you can see every upcoming show, pick a date and pay by M-Pesa on the [Tickets page](/tickets). Our next production, *Ithaka cia Kamĩrĩĩthũ*, has its story [here](/ithaka).' };
  if (hit('lost', 'download', 'resend', 'my ticket')) return { text: 'No worries — open [My Tickets](/tickets#my-tickets) and enter your order number with the phone or email you used. You can download your ticket again.' };
  if (hit('audition', 'casting', 'join', 'talent', 'act ', 'actor', 'perform')) return { text: 'We\'d love to see your talent! 🌟 Open calls, alerts and online applications are on the [Auditions page](/auditions). You can also join a subsidiary via [Subsidiaries](/subsidiaries).' };
  if (hit('hire', 'book', 'workshop', 'mc ', 'corporate', 'event management', 'pr ')) return { text: 'Wonderful — pick a service and a free date on [Book Us](/book), or see corporate services on [PBAG Events](/events). The team confirms within a working day.' };
  if (hit('language', 'nlp', 'kiswahili', 'gikuyu', 'kikuyu language', 'african language')) return { text: 'PBAG is building language technology for African languages — Gĩkũyũ, Kiswahili and Sheng — with communities. See [PBAG NLP](/nlp).' };
  if (hit(' ai', 'gemini', 'consult', 'artificial', 'film', 'veo', 'nano banana')) return { text: 'PBAG uses Google AI tools for theatre and film and offers training and consultancy — see [AI in Theatre & Film](/ai-film) or book a free call on [Book Us](/book?service=ai).' };
  if (hit('history', 'ithaka', 'kamiriithu', 'kamirithu', 'lari', 'mau mau', 'ngugi', 'chief', 'mukoma')) return { text: 'The history of Kamĩrĩĩthũ and Limuru — from Gĩkũyũ and Mũmbi to the Lari Massacre and Ngũgĩ\'s theatre — is on [Ithaka cia Kamĩrĩĩthũ](/ithaka), with a [Heritage Map](/heritage-map).' };
  if (hit('watch', 'comedy', 'video', 'youtube', 'funny')) return { text: 'Grab some popcorn 🍿 — the [Virtual Theatre](/theatre) screens PBAG originals first, then Kenyan comedy greats.' };
  if (hit('contact', 'phone', 'call', 'email', 'where', 'location')) return { text: `You can call or WhatsApp ${ORG.contact.phone}, or email ${ORG.contact.email} (or ${ORG.contact.emailAlt}). We\'re in Limuru, Kiambu County. More on the [Contact page](/contact).` };
  if (hit('thank', 'asante')) return { text: 'Asante sana — it\'s a pleasure! Anything else I can help with? 🎭' };
  return { text: 'I\'m sorry — I don\'t have a good answer for that yet. I can pass your question to the **PBAG Board & Management** so a person can reply to you. Would you like me to do that?', escalate: true };
}

