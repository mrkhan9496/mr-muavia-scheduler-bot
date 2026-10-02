/**
 * Personal message scheduler.
 * - Checks every 30s for due schedules (Asia/Karachi by default).
 * - Sends via sock, marks sent/failed, retries failed up to 3 times.
 * - Prevents duplicates: a schedule is claimed (status='sending') before send.
 */
const db = require('./db');

const CHECK_MS = 30 * 1000;
const MAX_ATTEMPTS = 3;

function nowIso() { return new Date().toISOString(); }

function toJid(number) {
    const clean = String(number).replace(/[^0-9]/g, '');
    if (clean.length < 10 || clean.length > 15) throw new Error('Invalid phone number: ' + number);
    return clean + '@s.whatsapp.net';
}

async function tick(sock) {
    let due = [];
    try { due = await db.getDueSchedules(nowIso()); }
    catch (e) { console.error('[scheduler] db read failed:', e.message); return; }

    for (const s of due) {
        // claim it so a second tick can't double-send
        try { await db.updateSchedule(s.id, { status: 'sending' }); }
        catch (e) { console.error('[scheduler] claim failed:', s.id, e.message); continue; }

        try {
            const jid = toJid(s.recipient);
            await sock.sendMessage(jid, { text: s.message });
            await db.updateSchedule(s.id, { status: 'sent', attempts: (s.attempts || 0) + 1, last_error: '' });
            console.log('[scheduler] sent:', s.id);
        } catch (e) {
            const attempts = (s.attempts || 0) + 1;
            const failed = attempts >= MAX_ATTEMPTS;
            await db.updateSchedule(s.id, {
                status: failed ? 'dead' : 'failed',
                attempts,
                last_error: String(e.message || e).slice(0, 300),
            });
            console.error('[scheduler] send failed:', s.id, e.message);
        }
    }
}

function start(sock) {
    console.log('[scheduler] started, check every 30s');
    // run once shortly after boot (catches anything due during downtime)
    setTimeout(() => tick(sock), 5000);
    setInterval(() => tick(sock), CHECK_MS);
}

function newId() {
    return 'sch_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

module.exports = { start, tick, newId, toJid };
