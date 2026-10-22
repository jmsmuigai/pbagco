// Storage layer. Production: Google Cloud Firestore (Native mode).
// Development: an in-memory store persisted to data/dev-db.json.
// Both expose the same tiny interface so the rest of the app never cares.
//
//   get(col, id)          -> doc | null
//   set(col, id, doc)     -> doc
//   update(col, id, patch)
//   list(col, where?)     -> where = [[field, '==', value], ...]
//   transact(async t => { await t.get(); t.set(); t.update(); })
//
// Collections: events, orders, tickets, sellers, bookings, messages,
//              videos, audit   (see docs/DATABASE.md)

import fs from 'node:fs';
import path from 'node:path';
import { SEED_EVENTS, SEED_VIDEOS, RETIRED_VIDEOS, SEED_AUDITIONS } from './content.js';

const DATA_FILE = path.resolve('data/dev-db.json');

function matches(doc, where = []) {
  return where.every(([f, op, v]) => {
    const x = f.split('.').reduce((o, k) => (o == null ? o : o[k]), doc);
    if (op === '==') return x === v;
    if (op === 'array-contains') return Array.isArray(x) && x.includes(v);
    if (op === '>=') return x >= v;
    if (op === '<=') return x <= v;
    return false;
  });
}

class MemoryStore {
  constructor() {
    this.kind = 'memory';
    this.data = {};
    try { this.data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch {}
    this._t = null;
  }
  _col(c) { return (this.data[c] ||= {}); }
  _persist() {
    clearTimeout(this._t);
    this._t = setTimeout(() => {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 1));
    }, 200);
  }
  async get(c, id) { const d = this._col(c)[id]; return d ? structuredClone(d) : null; }
  async set(c, id, doc) { this._col(c)[id] = structuredClone({ ...doc, id }); this._persist(); return doc; }
  async update(c, id, patch) {
    const cur = this._col(c)[id]; if (!cur) throw new Error(`${c}/${id} not found`);
    Object.assign(cur, structuredClone(patch)); this._persist(); return cur;
  }
  async list(c, where) { return Object.values(this._col(c)).filter((d) => matches(d, where)).map((d) => structuredClone(d)); }
  async transact(fn) {
    // Single-threaded event loop + no awaits on I/O inside => effectively serialised.
    const writes = [];
    const t = {
      get: (c, id) => this.get(c, id),
      set: (c, id, doc) => writes.push(() => this.set(c, id, doc)),
      update: (c, id, p) => writes.push(() => this.update(c, id, p)),
    };
    const r = await fn(t);
    for (const w of writes) await w();
    return r;
  }
}

class FirestoreStore {
  constructor(Firestore) {
    this.kind = 'firestore';
    this.fs = new Firestore({ ignoreUndefinedProperties: true });
  }
  async get(c, id) { const s = await this.fs.collection(c).doc(id).get(); return s.exists ? { id: s.id, ...s.data() } : null; }
  async set(c, id, doc) { await this.fs.collection(c).doc(id).set({ ...doc, id }); return doc; }
  async update(c, id, patch) { await this.fs.collection(c).doc(id).update(patch); }
  async list(c, where = []) {
    let q = this.fs.collection(c);
    for (const [f, op, v] of where) q = q.where(f, op, v);
    const s = await q.limit(1000).get();
    return s.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  async transact(fn) {
    return this.fs.runTransaction(async (tx) => {
      const t = {
        get: async (c, id) => { const s = await tx.get(this.fs.collection(c).doc(id)); return s.exists ? { id: s.id, ...s.data() } : null; },
        set: (c, id, doc) => tx.set(this.fs.collection(c).doc(id), { ...doc, id }),
        update: (c, id, p) => tx.update(this.fs.collection(c).doc(id), p),
      };
      return fn(t);
    });
  }
}

export async function createStore() {
  let store;
  if (process.env.DB === 'firestore' || (process.env.K_SERVICE && process.env.DB !== 'memory')) {
    const { Firestore } = await import('@google-cloud/firestore');
    store = new FirestoreStore(Firestore);
  } else {
    store = new MemoryStore();
  }
  await seed(store);
  return store;
}

// Idempotent: only inserts seed docs that don't exist yet.
async function seed(store) {
  for (const e of SEED_EVENTS) {
    const cur = await store.get('events', e.id);
    if (!cur) await store.set('events', e.id, { ...e, createdAt: new Date().toISOString() });
    else if ((e.seedVersion || 0) > (cur.seedVersion || 0)) {
      // Official details changed (dates/prices/venue): refresh the event but keep any sales already made.
      const sold = Object.fromEntries((cur.tiers || []).map((t) => [t.id, { sold: t.sold || 0, held: t.held || 0 }]));
      await store.set('events', e.id, { ...cur, ...e, tiers: e.tiers.map((t) => ({ ...t, ...(sold[t.id] || {}) })), updatedAt: new Date().toISOString() });
    }
  }
  for (const [i, v] of SEED_VIDEOS.entries()) {
    const cur = await store.get('videos', v.id);
    if (!cur) await store.set('videos', v.id, { ...v, order: i, addedAt: new Date().toISOString() });
    else if (!cur.section) await store.update('videos', v.id, { section: v.section, order: i }); // migrate older seeds
  }
  for (const id of RETIRED_VIDEOS) if (await store.get('videos', id)) await store.update('videos', id, { retired: true });
  for (const a of SEED_AUDITIONS) {
    const cur = await store.get('auditions', a.id);
    if (!cur) await store.set('auditions', a.id, { ...a, createdAt: new Date().toISOString() });
    else if ((a.seedVersion || 0) > (cur.seedVersion || 0)) await store.set('auditions', a.id, { ...cur, ...a, updatedAt: new Date().toISOString() });
  }
  if (!(await store.get('sellers', 'PBAG10'))) {
    await store.set('sellers', 'PBAG10', { code: 'PBAG10', name: 'PBAG Promoters Desk', phone: '', commissionRate: null, active: true, createdAt: new Date().toISOString() });
  }
}
