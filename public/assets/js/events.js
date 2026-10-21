import { $, api, stub, observeReveals } from './app.js';
api('/api/events').then((evs) => { $('#evGrid').innerHTML = evs.map(stub).join(''); observeReveals($('#evGrid')); }).catch(() => {});
