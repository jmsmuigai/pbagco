// Tools exposed to (a) the Gemini-powered usher bot via function calling and
// (b) external AI agents via the MCP server at /mcp. One definition, two doors.
import { z } from 'zod';
import { ORG, SUBSIDIARIES, BOOKING_SERVICES, AI_SERVICES, FAQ } from './content.js';
import { listEvents, getEvent, publicEvent, createBooking, busyDates, escalate, listAuditions } from './services.js';

const fmtDate = (iso) => new Date(iso).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const TOOLS = [
  {
    name: 'list_upcoming_events',
    description: 'List PBAG upcoming shows/events with dates, venues, starting prices and ticket links.',
    schema: {},
    jsonSchema: { type: 'object', properties: {} },
    run: async (db) => (await listEvents(db)).map((e) => ({
      title: e.title, category: e.category, by: e.subsidiaryName, venue: e.venue, from_price_kes: e.fromPrice,
      dates: e.performances.map((p) => fmtDate(p.startsAt)), ticket_link: `/tickets?event=${e.slug}`,
    })),
  },
  {
    name: 'check_ticket_availability',
    description: 'Get ticket tiers, prices and remaining seats for one event (by slug or title words).',
    schema: { event: z.string().describe('Event slug or part of its title') },
    jsonSchema: { type: 'object', properties: { event: { type: 'string', description: 'Event slug or part of its title' } }, required: ['event'] },
    run: async (db, { event }) => {
      let e = await getEvent(db, event);
      if (!e) {
        const q = String(event).toLowerCase();
        e = (await db.list('events')).find((x) => x.title.toLowerCase().includes(q) || x.slug.includes(q.replace(/\s+/g, '-')));
      }
      if (!e) return { error: 'No matching event' };
      const p = publicEvent(e);
      return { title: p.title, venue: p.venue, dates: p.performances.map((x) => fmtDate(x.startsAt)), tiers: p.tiers.map((t) => ({ name: t.name, price_kes: t.price, remaining: t.remaining, on_sale: t.onSale })), buy_link: `/tickets?event=${p.slug}` };
    },
  },
  {
    name: 'get_pbag_info',
    description: 'Facts about PBAG: history, mission, vision, values, management roles, subsidiaries, contacts, FAQ, AI consultancy services.',
    schema: { topic: z.enum(['about', 'subsidiaries', 'management', 'contact', 'faq', 'ai_consultancy', 'booking_services']).describe('Which topic') },
    jsonSchema: { type: 'object', properties: { topic: { type: 'string', enum: ['about', 'subsidiaries', 'management', 'contact', 'faq', 'ai_consultancy', 'booking_services'] } }, required: ['topic'] },
    run: async (_db, { topic }) => ({
      about: { story: ORG.story, mission: ORG.mission, vision: ORG.vision, purpose: ORG.purpose, values: ORG.values, founded: ORG.founded, members: ORG.members, tagline: ORG.tagline },
      subsidiaries: SUBSIDIARIES.map(({ name, kicker, summary, mission, offers }) => ({ name, kicker, summary, mission, offers, page: '/subsidiaries' })),
      management: { roles: ORG.management, philosophy: ORG.leadershipPhilosophy, note: 'The management team is appointed and overseen by PBAG Bunge, the lead subsidiary and governing organ of the Consortium. Full roles: /governance.' },
      contact: ORG.contact,
      faq: FAQ.map(([q, a]) => ({ q, a })),
      ai_consultancy: { services: AI_SERVICES.map(({ name, text }) => ({ name, text })), book: '/book?service=ai' },
      booking_services: BOOKING_SERVICES.map(({ id, name, note, slots }) => ({ id, name, note, slots })),
    }[topic] || { error: 'unknown topic' }),
  },
  {
    name: 'check_booking_dates',
    description: 'Return dates already taken by PBAG shows/confirmed bookings, to suggest free dates for hiring PBAG.',
    schema: {},
    jsonSchema: { type: 'object', properties: {} },
    run: async (db) => ({ busy_dates: await busyDates(db), today: new Date().toISOString().slice(0, 10) }),
  },
  {
    name: 'request_booking',
    description: 'Create a booking request to hire PBAG (performance, tfd workshop, comedy/MC, production, or ai consultation). Only call after the user has given name, phone or email, service, and date and confirmed they want to submit.',
    schema: {
      service: z.enum(['performance', 'tfd', 'comedy', 'production', 'ai']), date: z.string().describe('YYYY-MM-DD'), slot: z.string().optional(),
      name: z.string(), phone: z.string().optional(), email: z.string().optional(), org: z.string().optional(), notes: z.string().optional(),
    },
    jsonSchema: { type: 'object', properties: { service: { type: 'string', enum: ['performance', 'tfd', 'comedy', 'production', 'ai'] }, date: { type: 'string', description: 'YYYY-MM-DD' }, slot: { type: 'string' }, name: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' }, org: { type: 'string' }, notes: { type: 'string' } }, required: ['service', 'date', 'name'] },
    run: async (db, args, ctx = {}) => {
      const b = await createBooking(db, { ...args, source: ctx.source || 'bot' });
      return { ok: true, reference: b.id, message: 'Booking request received; the PBAG team will confirm by phone/email.' };
    },
  },
  {
    name: 'recommend_comedy',
    description: 'Recommend videos from the PBAG Virtual Theatre programme for a mood (silly, story, standup, classic, everyday).',
    schema: { mood: z.string().optional() },
    jsonSchema: { type: 'object', properties: { mood: { type: 'string' } } },
    run: async (db, { mood } = {}) => {
      const vids = (await db.list('videos')).sort((a, b) => a.order - b.order);
      const pick = mood ? vids.filter((v) => v.mood?.includes(String(mood).toLowerCase())) : vids;
      return (pick.length ? pick : vids).slice(0, 4).map((v) => ({ title: v.title, channel: v.channel, watch: `/theatre?v=${v.id}` }));
    },
  },
];

TOOLS.push(
  {
    name: 'list_auditions',
    description: 'List open and upcoming PBAG auditions (title, date, venue, roles, requirements, deadline) with the apply link.',
    schema: {}, jsonSchema: { type: 'object', properties: {} },
    run: async (db) => (await listAuditions(db)).map((a) => ({ title: a.title, by: a.by, date: a.date, time: a.time, venue: a.venue, deadline: a.deadline, roles: a.roles, requirements: a.requirements, status: a.status, apply: `/auditions#apply-${a.id}` })),
  },
  {
    name: 'escalate_to_management',
    description: 'Forward a question or complaint to the PBAG Board & Management when you cannot answer it, or when the person asks for a human. Only call after collecting their question and a phone number or email, and getting their OK.',
    schema: { question: z.string(), name: z.string().optional(), phone: z.string().optional(), email: z.string().optional() },
    jsonSchema: { type: 'object', properties: { question: { type: 'string' }, name: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' } }, required: ['question'] },
    run: async (db, args, ctx = {}) => { const r = await escalate(db, { ...args, source: ctx.source || 'bot' }); return { ok: true, reference: r.id, message: 'Sent to the PBAG Board & Management. They will reply by phone or email.' }; },
  },
);

export const toolByName = Object.fromEntries(TOOLS.map((t) => [t.name, t]));
