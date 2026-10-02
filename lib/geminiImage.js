/**
 * Google Gemini native image generation (REST).
 * Model default: gemini-2.5-flash-image (configurable via GEMINI_IMAGE_MODEL).
 * Returns { buffer, mime } or throws with a clean error (never leaks the key).
 */
const axios = require('axios');

const TIMEOUT = 90000;

async function generateImage(prompt) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey');
    const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    let res;
    try {
        res = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }, {
            headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
            timeout: TIMEOUT,
        });
    } catch (e) {
        const status = e.response?.status;
        const msg = e.response?.data?.error?.message || e.message;
        if (status === 400) throw new Error('Gemini rejected the request: ' + msg);
        if (status === 403) throw new Error('Gemini API key invalid or blocked.');
        if (status === 429) throw new Error('Gemini rate limit hit, try again later.');
        throw new Error('Gemini image API failed: ' + msg);
    }

    const parts = res.data?.candidates?.[0]?.content?.parts || [];
    for (const p of parts) {
        if (p.inlineData?.data) {
            return {
                buffer: Buffer.from(p.inlineData.data, 'base64'),
                mime: p.inlineData.mimeType || 'image/png',
            };
        }
    }
    const textOnly = parts.map(p => p.text || '').join(' ').slice(0, 200);
    throw new Error('Gemini returned no image.' + (textOnly ? ' Said: ' + textOnly : ''));
}

/** Gemini text chat (for chatbot + prompt gen fallback). */
async function chatText(message, system) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set.');
    const model = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const res = await axios.post(url, {
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: [{ parts: [{ text: message }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 300 },
    }, {
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        timeout: 30000,
    });
    const t = res.data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
    if (!t) throw new Error('Gemini returned empty reply.');
    return t;
}

module.exports = { generateImage, chatText };
