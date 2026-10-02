/**
 * .chatbot on | .chatbot off | .chatbot status   (owner/admin only)
 * State persisted in db settings -> survives restarts.
 */
const db = require('../lib/db');

async function chatbotCmd(sock, from, msg, args) {
    const sub = (args[0] || '').toLowerCase();
    if (sub === 'on') {
        await db.setSetting('chatbot', 'on');
        return sock.sendMessage(from, { text: '✅ Chatbot ON — I will auto-reply to messages.' }, { quoted: msg });
    }
    if (sub === 'off') {
        await db.setSetting('chatbot', 'off');
        return sock.sendMessage(from, { text: '❌ Chatbot OFF — no auto-replies.' }, { quoted: msg });
    }
    if (sub === 'status' || !sub) {
        const st = await db.getSetting('chatbot');
        return sock.sendMessage(from, { text: `🤖 Chatbot is currently *${st === 'on' ? 'ON ✅' : 'OFF ❌'}*` }, { quoted: msg });
    }
    return sock.sendMessage(from, { text: '❌ Usage: .chatbot on | .chatbot off | .chatbot status' }, { quoted: msg });
}

/** Rate limiter: max 1 reply per 5s per chat. */
const lastReply = new Map();
function canReply(chatId) {
    const now = Date.now();
    const last = lastReply.get(chatId) || 0;
    if (now - last < 5000) return false;
    lastReply.set(chatId, now);
    return true;
}

module.exports = { chatbotCmd, canReply };
