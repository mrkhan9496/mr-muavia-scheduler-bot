/**
 * Channel commands (owner/admin only):
 * .channelstatus | .autopost on|off | .settimes 10:00,13:00,... | .postnow
 */
const db = require('../lib/db');
const channelPost = require('../lib/channelPost');

async function channelStatusCmd(sock, from, msg) {
    const jid = (await db.getSetting('channel_jid')) || process.env.CHANNEL_JID || '';
    const autopost = await db.getSetting('autopost');
    const times = await db.getSetting('post_times');
    const last = await db.getSetting('last_post');
    const err = await db.getSetting('last_post_error');
    const count = await db.getSetting('post_count');
    const tz = process.env.TIMEZONE || 'Asia/Karachi';

    // next scheduled post (best effort)
    let next = '—';
    try {
        const slots = channelPost.parseTimes(times);
        const now = channelPost.tzNow();
        const cur = channelPost.hhmm(now);
        const later = slots.filter(t => t > cur);
        next = later.length ? `today ${later[0]}` : (slots.length ? `tomorrow ${slots[0]}` : '—');
    } catch {}

    await sock.sendMessage(from, { text:
        `📢 *Channel Status*\n\n` +
        `🔗 Channel: ${jid ? '✅ configured' : '❌ NOT configured'}\n` +
        `🤖 Auto-post: ${autopost === 'on' ? '✅ ON' : '❌ OFF'}\n` +
        `🕐 Times: ${times}\n` +
        `🌍 Timezone: ${tz}\n` +
        `📮 Total posts: ${count}\n` +
        `✅ Last post: ${last ? new Date(last).toLocaleString() : 'never'}\n` +
        `⏭️ Next: ${next}\n` +
        (err ? `⚠️ Last error: ${err}\n` : '') +
        `\n> © POWERED BY MUAVIA SCHEDULER BOT`
    }, { quoted: msg });
}

async function autopostCmd(sock, from, msg, args) {
    const v = (args[0] || '').toLowerCase();
    if (v !== 'on' && v !== 'off') {
        return sock.sendMessage(from, { text: '❌ Usage: .autopost on | .autopost off' }, { quoted: msg });
    }
    await db.setSetting('autopost', v);
    await sock.sendMessage(from, { text: v === 'on' ? '✅ Channel auto-posting ON' : '❌ Channel auto-posting OFF' }, { quoted: msg });
}

async function settimesCmd(sock, from, msg, args) {
    const raw = args.join(' ').replace(/\s/g, '');
    const times = channelPost.parseTimes(raw);
    if (!times.length) {
        return sock.sendMessage(from, { text: '❌ Usage: .settimes 10:00,13:00,16:00,19:00,22:00' }, { quoted: msg });
    }
    await db.setSetting('post_times', times.join(','));
    await sock.sendMessage(from, { text: `✅ Posting times set:\n🕐 ${times.join(', ')}` }, { quoted: msg });
}

async function postnowCmd(sock, from, msg) {
    await sock.sendMessage(from, { text: '🎨 Generating image...' }, { quoted: msg });
    try {
        const { prompt, n } = await channelPost.doPost(sock, true);
        await sock.sendMessage(from, { text: `✅ Posted to channel (#${n})!\n\nImage Prompt:\n"${prompt.slice(0, 200)}"` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Post failed: ' + e.message }, { quoted: msg });
    }
}

async function setchannelCmd(sock, from, msg, args) {
    const jid = (args[0] || '').trim();
    if (!jid || !jid.includes('@')) {
        return sock.sendMessage(from, { text: '❌ Usage: .setchannel <channel_jid>\nExample: .setchannel 1203630XXXX@newsletter' }, { quoted: msg });
    }
    await db.setSetting('channel_jid', jid);
    await sock.sendMessage(from, { text: '✅ Channel configured.' }, { quoted: msg });
}

module.exports = { channelStatusCmd, autopostCmd, settimesCmd, postnowCmd, setchannelCmd };
