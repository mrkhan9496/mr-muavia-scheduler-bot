/**
 * .gemini <sawal> — seedha Google Gemini se jawab.
 * API key .env mein GEMINI_API_KEY se aati hai (kabhi hard-code nahi).
 *
 * Example: .gemini Pakistan ka capital kya hai?
 */
const { chatText } = require('../lib/geminiImage');

async function geminiCmd(sock, from, msg, args) {
    const q = (args || []).join(' ').trim();
    if (!q) {
        return sock.sendMessage(from, { text: '❌ Sawal likho:\n.gemini Pakistan ka capital kya hai?' }, { quoted: msg });
    }
    try {
        const reply = await chatText(q.slice(0, 1000),
            'You are a helpful WhatsApp assistant. Reply briefly (under 80 words) in the same language the user writes in.');
        await sock.sendMessage(from, { text: `✨ *Gemini:*\n\n${reply}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Gemini error: ' + e.message }, { quoted: msg });
    }
}

module.exports = { geminiCmd };
