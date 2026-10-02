/**
 * .schedule 923001234567 | 08:30 PM | Your message here
 * .schedule 923001234567 | 2026-10-03 20:30 | Your message here
 * .schedules | .cancel <id> | .cancelall
 * Owner/admin only.
 */
const db = require('../lib/db');
const { newId } = require('../lib/scheduler');

function parseDateTime(s) {
    s = s.trim();
    // "2026-10-03 20:30" or "2026-10-03"
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?$/i);
    if (m) {
        let hh = parseInt(m[4] || '09', 10), mm = parseInt(m[5] || '00', 10);
        const ap = (m[6] || '').toUpperCase();
        if (ap === 'PM' && hh < 12) hh += 12;
        if (ap === 'AM' && hh === 12) hh = 0;
        return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]), hh, mm, 0);
    }
    // "08:30 PM" / "20:30" -> today (or tomorrow if passed)
    m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (m) {
        let hh = parseInt(m[1], 10); const mm = parseInt(m[2], 10);
        const ap = (m[3] || '').toUpperCase();
        if (ap === 'PM' && hh < 12) hh += 12;
        if (ap === 'AM' && hh === 12) hh = 0;
        const d = new Date(); d.setHours(hh, mm, 0, 0);
        if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
        return d;
    }
    return null;
}

function fmt(d) {
    const x = new Date(d);
    return x.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

async function scheduleCmd(sock, from, msg, args, isAdmin) {
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Owner only.' }, { quoted: msg });
    const raw = args.join(' ').trim();
    const parts = raw.split('|').map(p => p.trim());
    if (parts.length < 3) {
        return sock.sendMessage(from, { text:
            '❌ Usage:\n.schedule <number> | <time> | <message>\n\nExamples:\n.schedule 923001234567 | 08:30 PM | Assalam o Alaikum!\n.schedule 923001234567 | 2026-10-03 20:30 | Meeting reminder' },
            { quoted: msg });
    }
    const [number, when, ...msgParts] = parts;
    const message = msgParts.join(' | ').trim();
    if (!/^[0-9+\s-]{10,16}$/.test(number)) {
        return sock.sendMessage(from, { text: '❌ Invalid phone number.' }, { quoted: msg });
    }
    if (!message) return sock.sendMessage(from, { text: '❌ Message is empty.' }, { quoted: msg });
    const date = parseDateTime(when);
    if (!date || isNaN(date.getTime())) {
        return sock.sendMessage(from, { text: '❌ Invalid date/time. Use "08:30 PM" or "2026-10-03 20:30".' }, { quoted: msg });
    }
    if (date.getTime() <= Date.now()) {
        return sock.sendMessage(from, { text: '❌ Time must be in the future.' }, { quoted: msg });
    }
    const id = newId();
    await db.addSchedule({ id, recipient: number.replace(/[^0-9]/g, ''), message, run_at: date.toISOString() });
    await sock.sendMessage(from, { text: `✅ Scheduled!\n🆔 ${id}\n📱 ${number}\n🕐 ${fmt(date)}\n💬 ${message.slice(0, 80)}` }, { quoted: msg });
}

async function schedulesCmd(sock, from, msg, isAdmin) {
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Owner only.' }, { quoted: msg });
    const all = await db.listSchedules();
    const pending = all.filter(s => s.status === 'pending' || s.status === 'failed');
    if (!pending.length) return sock.sendMessage(from, { text: '📭 No pending schedules.' }, { quoted: msg });
    const lines = pending.slice(0, 15).map(s =>
        `🆔 ${s.id}\n📱 ${s.recipient} | 🕐 ${fmt(s.run_at)} | ${s.status}\n💬 ${String(s.message).slice(0, 60)}`);
    await sock.sendMessage(from, { text: `📅 Pending (${pending.length}):\n\n${lines.join('\n\n')}` }, { quoted: msg });
}

async function cancelCmd(sock, from, msg, args, isAdmin) {
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Owner only.' }, { quoted: msg });
    const id = (args[0] || '').trim();
    if (!id) return sock.sendMessage(from, { text: '❌ Usage: .cancel <schedule_id>' }, { quoted: msg });
    const ok = await db.cancelSchedule(id);
    await sock.sendMessage(from, { text: ok ? `✅ Cancelled ${id}` : '❌ Not found or already done.' }, { quoted: msg });
}

async function cancelAllCmd(sock, from, msg, isAdmin) {
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Owner only.' }, { quoted: msg });
    const n = await db.cancelAllSchedules();
    await sock.sendMessage(from, { text: `✅ Cancelled ${n} schedule(s).` }, { quoted: msg });
}

module.exports = { scheduleCmd, schedulesCmd, cancelCmd, cancelAllCmd };
