/**
 * Chatbot AI: Gemini first, OpenAI-compatible fallback second.
 * Never throws raw key material; returns friendly errors instead.
 */
const axios = require('axios');
const { chatText } = require('./geminiImage');

const SYSTEM = 'You are a friendly WhatsApp chatbot. Reply briefly (under 60 words), warmly, in the same language the user writes in.';

async function openaiFallback(message) {
    const key = process.env.AI_API_KEY;
    if (!key) throw new Error('no fallback key');
    const base = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = process.env.AI_MODEL || 'gpt-3.5-turbo';
    const res = await axios.post(base + '/chat/completions', {
        model,
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: message }],
        max_tokens: 200,
        temperature: 0.9,
    }, { headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, timeout: 30000 });
    const t = res.data?.choices?.[0]?.message?.content?.trim();
    if (!t) throw new Error('empty fallback reply');
    return t;
}

async function reply(message) {
    const errors = [];
    try { return await chatText(message, SYSTEM); }
    catch (e) { errors.push('gemini: ' + e.message); }
    try { return await openaiFallback(message); }
    catch (e) { errors.push('fallback: ' + e.message); }
    throw new Error('AI unavailable (' + errors.join(' | ') + ')');
}

module.exports = { reply };
