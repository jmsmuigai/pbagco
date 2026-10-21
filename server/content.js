// Single source of truth for PBAG organisational content.
// Mined & cleaned from "PBAG Website Concept Brief.pdf" (Oct 2026 edition)
// and the earlier enhanced brief. Used by the site pages (via /api/site),
// the Gemini usher bot (as grounding), and the MCP server.

export const ORG = {
  name: 'PBAG Consortium',
  fullName: 'Peers Best Art Group',
  domain: 'pbagco.com',
  founded: '2011-08-23',
  foundedPlace: 'Limuru, Kiambu County, Kenya',
  founder: 'Boni Kanyuira',
  members: 41,
  tagline: 'Nurturing Talent. Creating Art. Transforming Communities.',
  mission: "To identify, nurture and execute talents and skills for excellence and God's glory.",
  vision: 'To be a world-class group that observes disciplined execution of its artwork.',
  purpose:
    'PBAG exists to create a platform where talent can be identified, nurtured, developed, and transformed into meaningful artistic expression — empowering young people, promoting creativity, and using art as a vehicle for positive change in society.',
  story: [
    'PBAG (Peers Best Art Group) is a community-based arts organisation founded on 23rd August 2011 by a group of like-minded young artists from Limuru, Kenya, under the leadership of Boni Kanyuira, the brainchild behind its formation.',
    'It was established to bring young people together around a common purpose: identifying, nurturing, developing and showcasing artistic talent, while using the arts to address real issues affecting society. From its inception, PBAG has embraced Theatre for Community Development as a tool for entertainment, education, community engagement, awareness creation and social transformation.',
    'Over the years PBAG has grown from a youth arts group into a broader artistic consortium. It currently has forty-one members across its subsidiaries, most of them drawn from Limuru Sub-County, Kiambu County.',
  ],
  values: [
    { name: 'Unity', text: 'Collaboration, teamwork and shared purpose are central to our artistic and organisational growth.' },
    { name: 'Love', text: 'Respect, care, inclusion and genuine support for one another, our audiences, our communities and the wider creative fraternity.' },
    { name: 'Sacrifice', text: 'Meaningful artistic work requires commitment, dedication and a willingness to give of ourselves for a greater purpose.' },
    { name: 'Discipline', text: 'Professionalism, responsibility, commitment and excellence in the execution of our artistic work.' },
  ],
  management: [
    { role: 'Chairman', title: 'Executive Director', duty: 'Provides overall strategic leadership, direction and oversight of the Consortium.' },
    { role: 'Vice Chairperson', title: 'Operations Director', duty: 'Supports the Chairman and oversees the coordination of the Consortium’s operations.' },
    { role: 'Secretary', title: 'Programmes Manager', duty: 'Coordinates programmes, activities, documentation, communication and implementation of approved initiatives.' },
    { role: 'Treasurer', title: 'Finance Director', duty: 'Oversees financial planning, accountability, budgeting, expenditure and financial reporting.' },
    { role: 'Vice Secretary', title: 'Administration Manager', duty: 'Supports administrative functions, records management, coordination and organisational communication.' },
  ],
  leadershipPhilosophy:
    'Effective management is built on teamwork, accountability, discipline, creativity and shared responsibility — different members contributing their expertise while working towards one common vision.',
  contact: {
    phone: '0720 960 180',
    phoneIntl: '+254720960180',
    email: 'theatre@pbagco.com',
    whatsapp: 'https://wa.me/254720960180',
    address: 'Limuru, Kiambu County, Kenya',
    social: {
      facebook: 'https://web.facebook.com/Pbagconsortium',
      youtube: 'https://www.youtube.com/channel/UCFV2mTNumJFcQG6-s-xg_Ew',
      // TODO(PBAG): confirm handles — "pbagtheatre" appears on the consortium logo artwork.
      instagram: 'https://www.instagram.com/pbagtheatre',
      tiktok: 'https://www.tiktok.com/@pbagtheatre',
    },
  },
  youtubeUploads: 'UUFV2mTNumJFcQG6-s-xg_Ew',
};

export const SUBSIDIARIES = [
  {
    slug: 'pbag-theatre',
    name: 'PBAG Theatre',
    kicker: 'Professional Theatre & Theatre for Development',
    logo: '/assets/img/logo-theatre.webp',
    color: '#8B3FD9',
    icon: 'drama',
    summary:
      'Professional theatre productions, issue-based performances and Theatre for Development programmes that use drama to engage audiences and communities around relevant social and cultural issues.',
    mission: 'To create impactful theatre that entertains, educates, provokes dialogue and contributes to social and cultural development.',
    offers: ['Stage productions & seasons', 'Issue-based / forum theatre', 'Theatre for Development (TfD) programmes', 'Schools & community tours'],
    join: 'Hi PBAG, I would like to join PBAG Theatre',
  },
  {
    slug: 'peatice-productions',
    name: 'Peatice Productions',
    kicker: 'Entertainment, Media & Content',
    logo: '/assets/img/logo-peatice.webp',
    color: '#2F6FD6',
    icon: 'clapperboard',
    summary:
      'Comedy stage and screen shows, short-form content, entertainment media and creative resources — giving artists platforms while creating engaging content for contemporary audiences.',
    mission: 'To create entertaining, innovative and accessible content that provides opportunities for creative talent and connects audiences with compelling stories and experiences.',
    offers: ['Comedy stage & screen shows', 'Short-form content creation', 'Entertainment media production', 'Creative resources for artists'],
    join: 'Hi PBAG, I would like to work with Peatice Productions',
  },
  {
    slug: 'peers-got-talanta',
    name: 'Peers Got Talanta (PGT) CBO',
    kicker: 'Community, Talent & Social Impact',
    logo: '/assets/img/logo-pgt.webp',
    color: '#F2A516',
    icon: 'trophy',
    summary:
      'Community-level outreach, talent discovery, youth empowerment, NAC Week, creative entrepreneurship and social-impact programmes — home of the PGT Festival.',
    mission: 'To discover and nurture talent, empower young people and use creativity as a catalyst for community development, entrepreneurship and positive social change.',
    offers: ['PGT Festival talent search', 'Youth empowerment & mentorship', 'NAC Week (Arts & Culture Week)', 'Creative entrepreneurship'],
    join: 'Hi PBAG, I would like to join Peers Got Talanta (PGT)',
  },
  {
    slug: 'pbag-bunge',
    name: 'PBAG Bunge',
    kicker: 'Leadership, Civic Engagement & Advocacy · Lead subsidiary',
    logo: '/assets/img/logo-bunge.webp',
    color: '#1C1C28',
    icon: 'landmark',
    lead: true,
    summary:
      'Platforms for leadership development, civic engagement, policy dialogue, governance forums, mentorship and youth advocacy — encouraging informed participation in community and public affairs. Home of the Consortium’s management.',
    mission: 'To cultivate informed, responsible and engaged citizens by creating spaces for leadership, dialogue, mentorship and civic participation.',
    offers: ['Leadership development', 'Policy dialogue & governance forums', 'Mentorship', 'Youth advocacy'],
    join: 'Hi PBAG, I would like to join PBAG Bunge',
  },
];

// Seed events. Dates/prices are PROVISIONAL until PBAG confirms them —
// producers can edit everything from the Staff › Events panel or Firestore.
export const SEED_EVENTS = [
  {
    id: 'evt-bunge-forum',
    slug: 'bunge-youth-governance-forum',
    title: 'Bunge Youth Governance Forum',
    subsidiary: 'pbag-bunge',
    category: 'Forum',
    tagline: 'Debate. Dialogue. Lead.',
    description:
      'A parliamentary-style afternoon of structured debate, policy dialogue and mentorship circles for young leaders — open to members and guests.',
    venue: 'Limuru Town Hall, Limuru',
    performances: [{ id: 'p1', startsAt: '2026-11-07T14:00:00+03:00' }],
    tiers: [{ id: 'delegate', name: 'Delegate Pass', price: 300, capacity: 200, sold: 0 }],
    commissionRate: 0.08,
    palette: ['#5865F2', '#1C1C28'],
    status: 'on_sale',
  },
  {
    id: 'evt-pgt-ndeiya',
    slug: 'pgt-festival-ndeiya-talent-search',
    title: 'PGT Festival · Ndeiya Talent Search',
    subsidiary: 'peers-got-talanta',
    category: 'Talent Search',
    tagline: '7th Edition',
    description:
      'The 7th edition of the Peers Got Talanta Festival. Categories include Tech & Digital Innovation, Comedy, Theatre & Film and more. Winners go on to the Ndeiya Arts & Culture Week. Registration enquiries: 0725 787 214.',
    venue: 'Royoh Shopping Centre / Kamangu Centre, Ndeiya',
    performances: [
      { id: 'p1', startsAt: '2026-11-14T10:00:00+03:00' },
      { id: 'p2', startsAt: '2026-11-15T10:00:00+03:00' },
      { id: 'p3', startsAt: '2026-11-16T10:00:00+03:00' },
    ],
    tiers: [
      { id: 'contestant', name: 'Contestant Registration', price: 500, capacity: 300, sold: 0 },
      { id: 'audience', name: 'Audience', price: 200, capacity: 600, sold: 0 },
    ],
    commissionRate: 0.1,
    palette: ['#F2A516', '#E8445A'],
    status: 'on_sale',
  },
  {
    id: 'evt-peatice-comedy',
    slug: 'peatice-comedy-night-live',
    title: 'Peatice Comedy Night — Live',
    subsidiary: 'peatice-productions',
    category: 'Comedy',
    tagline: 'Stand-up · Sketch · Improv',
    description:
      'An evening of stand-up, sketches and improv from Peatice Productions and guest comics — recorded live for the PBAG channel.',
    venue: 'Limuru Social Hall, Limuru',
    performances: [{ id: 'p1', startsAt: '2026-11-28T19:00:00+03:00' }],
    tiers: [
      { id: 'early', name: 'Early Bird', price: 500, capacity: 80, sold: 0, salesEnd: '2026-11-14T23:59:00+03:00' },
      { id: 'regular', name: 'Regular', price: 800, capacity: 220, sold: 0 },
      { id: 'vip', name: 'VIP Front Row', price: 1500, capacity: 30, sold: 0 },
    ],
    commissionRate: 0.1,
    palette: ['#2F6FD6', '#8B3FD9'],
    status: 'on_sale',
  },
  {
    id: 'evt-ithaka',
    slug: 'ithaka-cia-kamiriithu',
    title: 'Ithaka cia Kamĩrĩĩthũ',
    subsidiary: 'pbag-theatre',
    category: 'Theatre',
    tagline: 'A stage production by PBAG Theatre',
    description:
      'PBAG Theatre’s flagship stage production, rooted in the Kamĩrĩĩthũ community-theatre tradition of Limuru. A limited festive run — matinée and evening shows.',
    venue: 'Kenya National Theatre, Nairobi',
    performances: [
      { id: 'p1', startsAt: '2026-12-11T19:00:00+03:00' },
      { id: 'p2', startsAt: '2026-12-12T15:00:00+03:00' },
      { id: 'p3', startsAt: '2026-12-12T19:00:00+03:00' },
      { id: 'p4', startsAt: '2026-12-13T15:00:00+03:00' },
    ],
    tiers: [
      { id: 'early', name: 'Early Bird', price: 800, capacity: 100, sold: 0, salesEnd: '2026-11-30T23:59:00+03:00' },
      { id: 'regular', name: 'Regular', price: 1200, capacity: 300, sold: 0 },
      { id: 'vip', name: 'VIP', price: 2500, capacity: 50, sold: 0 },
    ],
    commissionRate: 0.1,
    palette: ['#8B3FD9', '#E8445A'],
    status: 'on_sale',
  },
];

// Virtual theatre programme. Video IDs were checked against public pages;
// PBAG can add more from Staff › Programme (stored in the `videos` collection).
export const SEED_VIDEOS = [
  { id: 'aWPWFBrcGZk', title: 'Njugush Ame Nduthika', channel: 'Njugush', mood: ['silly', 'everyday'] },
  { id: 'nml3nN1fbjM', title: 'The Calls That Changed My Life Financially', channel: 'Njugush', mood: ['story', 'everyday'] },
  { id: '7RiKaAmYXYo', title: 'Usicheze na Conductor wa Mat za Mwihoko', channel: 'Henry Desagu', mood: ['silly', 'everyday'] },
  { id: 'woSyco8DLm8', title: 'Churchill Show — All Star Edition', channel: 'Churchill Show', mood: ['standup', 'classic'] },
  { id: 'lp1SEc7pWCQ', title: 'Try Not To Laugh — Comedy Compilation', channel: 'Eric Omondi', mood: ['silly', 'standup'] },
  { id: '4KpaPg0kox8', title: '10 Years in Comedy — In Conversation', channel: 'Njugush', mood: ['story', 'classic'] },
];

export const BOOKING_SERVICES = [
  { id: 'performance', name: 'Book a PBAG performance', icon: 'drama', duration: 'Half / full day', slots: ['Morning', 'Afternoon', 'Evening'], note: 'Corporate events, launches, festivals, schools.' },
  { id: 'tfd', name: 'Theatre for Development workshop', icon: 'megaphone', duration: 'Half day', slots: ['Morning', 'Afternoon'], note: 'Forum theatre on health, governance, environment, GBV and more.' },
  { id: 'comedy', name: 'Comedians / MC (Peatice)', icon: 'mic-vocal', duration: 'Per event', slots: ['Afternoon', 'Evening'], note: 'Stand-up sets, MCs and sketch acts.' },
  { id: 'production', name: 'Content & production services', icon: 'clapperboard', duration: 'Per project', slots: ['Morning', 'Afternoon'], note: 'Short-form content, event filming, creative direction.' },
  { id: 'ai', name: 'Generative AI consultation', icon: 'sparkles', duration: '60 min', slots: ['10:00', '11:30', '14:00', '15:30'], note: 'Free discovery call for creatives, NGOs and businesses.' },
];

export const AI_SERVICES = [
  { icon: 'wand-sparkles', name: 'AI for creative production', text: 'Use generative AI to brainstorm scripts, storyboard scenes, draft posters and caption content — with humans firmly in the director’s chair.' },
  { icon: 'bot', name: 'Smart bots & AI ushers', text: 'Gemini-powered assistants for your website, WhatsApp or box office that answer questions, sell tickets and take bookings 24/7 — like the one on this site.' },
  { icon: 'bar-chart-3', name: 'Audience & campaign analytics', text: 'Turn ticket sales, social engagement and survey data into insight dashboards that show what works and who your audience is.' },
  { icon: 'graduation-cap', name: 'AI literacy for artists & youth', text: 'Hands-on workshops that teach young creatives to use AI tools productively, safely and ethically — and to protect their own work.' },
  { icon: 'shield-check', name: 'Responsible AI, IP & data protection', text: 'Guidance on copyright, consent, likeness rights and Kenya’s Data Protection Act when using AI with creative work and audience data.' },
  { icon: 'presentation', name: 'AI-powered Theatre for Development', text: 'Pair forum theatre with AI tools — multilingual scripts, rapid community surveys and impact reporting — for NGOs and county programmes.' },
];

export const FAQ = [
  ['How do I buy a ticket?', 'Open Tickets, pick a date on the calendar, choose your ticket type and quantity, then pay with M-Pesa (an STK prompt appears on your phone), card or PayPal. Your QR ticket is shown instantly and you can download it as a PDF or image.'],
  ['I lost my ticket', 'Go to Tickets › My Tickets and enter your order number with the phone number or email you used. You can download it again.'],
  ['Refunds', 'Tickets are non-refundable unless an event is cancelled or rescheduled, in which case PBAG contacts buyers directly. Call 0720 960 180 for help.'],
  ['How do I join PBAG?', 'Each subsidiary has a Join button on the Subsidiaries page that opens WhatsApp to the PBAG team.'],
  ['Can I hire PBAG?', 'Yes — use Book Us to request a performance, Theatre for Development workshop, comedians/MC, production services or an AI consultation on a date that suits you.'],
  ['Become a seller', 'Promoters and influencers get a personal referral code, link and QR code and earn commission on every ticket sold. Ask the PBAG team to register you.'],
];
