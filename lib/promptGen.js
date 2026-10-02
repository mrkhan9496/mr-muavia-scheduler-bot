/**
 * AI image-prompt generator.
 * - Picks a random category (expandable) and builds a rich, unique prompt.
 * - Avoids repeats: keeps a short history of recent prompts (in-memory + setting).
 * - If GEMINI_API_KEY is set, asks Gemini for a fresh prompt; otherwise uses
 *   built-in template combos (still unique via random slots).
 */
const axios = require('axios');
const db = require('./db');

const CATEGORIES = {
    cinematic: ['cinematic portrait', 'dramatic film still', 'movie poster style portrait'],
    fashion: ['high fashion editorial', 'streetwear lookbook', 'haute couture portrait'],
    luxury: ['luxury lifestyle', 'golden opulence', 'royal elegance'],
    nature: ['misty mountain dawn', 'tropical waterfall', 'desert night sky'],
    cars: ['supercar at night', 'vintage classic car', 'futuristic concept car'],
    architecture: ['modern skyscraper', 'ancient mosque architecture', 'futuristic city'],
    fantasy: ['floating castle', 'dragon valley', 'enchanted forest spirit'],
    travel: ['santorini sunset', 'northern lights iceland', 'kyoto temple autumn'],
    photography: ['studio portrait rembrandt light', 'macro dewdrop', 'long exposure city'],
    motivational: ['mountain climber sunrise', 'lone wolf moonlight', 'phoenix rising'],
    islamic: ['sheikh zayed mosque night', 'islamic geometric art', 'kaaba golden hour'],
    night: ['neon tokyo rain', 'milky way desert', 'city bokeh night'],
    studio: ['beauty portrait softbox', 'dramatic low-key portrait', 'color gel portrait'],
    creative: ['melting clock surreal', 'underwater library', 'giant moon city'],
};

const STYLES = [
    'ultra detailed, 8k', 'photorealistic, sharp focus', 'cinematic lighting, depth of field',
    'vibrant colors, high contrast', 'soft golden hour glow', 'moody atmospheric haze',
    'hyperrealistic texture', 'award winning photography',
];
const MOODS = ['serene', 'epic', 'mysterious', 'joyful', 'dramatic', 'dreamlike', 'powerful', 'peaceful'];

function rand(a) { return a[Math.floor(Math.random() * a.length)]; }

function templatePrompt() {
    const cats = Object.keys(CATEGORIES);
    const cat = rand(cats);
    const subject = rand(CATEGORIES[cat]);
    return `A ${rand(MOODS)} ${subject}, ${rand(STYLES)}, professional composition`;
}

async function geminiPrompt() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('no key');
    const cats = Object.keys(CATEGORIES).join(', ');
    const model = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const r = await axios.post(url, {
        contents: [{ parts: [{ text:
            `Write ONE unique, vivid AI image-generation prompt (single sentence, under 40 words). ` +
            `Pick a fresh theme from: ${cats}. Make it cinematic and detailed. ` +
            `Output ONLY the prompt, no quotes, no explanation.` }] }],
        generationConfig: { temperature: 1.0, maxOutputTokens: 120 },
    }, { headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, timeout: 25000 });
    const t = r.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = t.replace(/^["']|["']$/g, '').trim().split('\n')[0];
    if (clean.length < 10) throw new Error('empty gemini prompt');
    return clean;
}

async function recentPrompts() {
    try {
        const raw = await db.getSetting('recent_prompts');
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

async function pushRecent(p) {
    try {
        const arr = await recentPrompts();
        arr.unshift(p);
        await db.setSetting('recent_prompts', JSON.stringify(arr.slice(0, 30)));
    } catch {}
}

/** Generate a unique prompt, avoiding the last 30 used. */
async function generate() {
    const recent = await recentPrompts();
    for (let i = 0; i < 4; i++) {
        let p;
        try { p = await geminiPrompt(); }
        catch { p = templatePrompt(); }
        if (!recent.includes(p)) {
            await pushRecent(p);
            return p;
        }
    }
    const p = templatePrompt() + ' ' + Date.now().toString(36);
    await pushRecent(p);
    return p;
}

module.exports = { generate, CATEGORIES: Object.keys(CATEGORIES) };
