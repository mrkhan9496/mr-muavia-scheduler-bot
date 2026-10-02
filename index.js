/**
 * MR MUAVIA SCHEDULER BOT (personal)
 * Features: personal message scheduler, WhatsApp channel auto-posting
 * (Gemini AI images), AI chatbot on/off. Persistent via Postgres/file.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

const db = require('./lib/db');
const scheduler = require('./lib/scheduler');
const channelPost = require('./lib/channelPost');
const aiChat = require('./lib/aiChat');

const scheduleCmds = require('./commands/schedule');
const channelCmds = require('./commands/channel');
const chatbotCmds = require('./commands/chatbot');
const menuCmds = require('./commands/menu');

const OWNER = (process.env.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
const AUTH_DIR = path.join(process.cwd(), 'auth_info');

let sock = null;

function isOwner(jid) {
    const num = jidNormalizedUser(jid).split('@')[0].replace(/[^0-9]/g, '');
    return OWNER && (num === OWNER || num.endsWith(OWNER.slice(-10)));
}

async function handleCommand(cmd, args, from, msg, isAdmin) {
    switch (cmd) {
        case 'menu': case 'help': return menuCmds.menuCmd(sock, from, msg);
        case 'ping': return menuCmds.pingCmd(sock, from, msg);
        case 'schedule': return scheduleCmds.scheduleCmd(sock, from, msg, args, isAdmin);
        case 'schedules': return scheduleCmds.schedulesCmd(sock, from, msg, isAdmin);
        case 'cancel': return scheduleCmds.cancelCmd(sock, from, msg, args, isAdmin);
        case 'cancelall': return scheduleCmds.cancelAllCmd(sock, from, msg, isAdmin);
        case 'channelstatus': return channelCmds.channelStatusCmd(sock, from, msg);
        case 'autopost': return channelCmds.autopostCmd(sock, from, msg, args);
        case 'settimes': return channelCmds.settimesCmd(sock, from, msg, args);
        case 'postnow': return channelCmds.postnowCmd(sock, from, msg);
        case 'setchannel': return channelCmds.setchannelCmd(sock, from, msg, args);
        case 'findchannel': return channelCmds.findchannelCmd(sock, from, msg, args);
        case 'chatbot': return chatbotCmds.chatbotCmd(sock, from, msg, args);
        default: return null; // unknown
    }
}

async function onMessage(m) {
    try {
        const msg = m.messages?.[0];
        if (!msg?.message) return;
        const from = msg.key.remoteJid;
        const isMe = msg.key.fromMe;
        if (isMe) return; // never reply to own messages (no loops)
        if (from === 'status@broadcast') return;

        const text = msg.message.conversation
            || msg.message.extendedTextMessage?.text
            || msg.message.imageMessage?.caption
            || '';
        if (!text) return;

        const admin = isOwner(from) || isOwner(msg.key.participant || '');
        const prefix = '.';

        if (text.startsWith(prefix)) {
            const [raw, ...args] = text.slice(1).trim().split(/\s+/);
            const cmd = raw.toLowerCase();
            // admin-only commands
            const adminOnly = ['schedule', 'schedules', 'cancel', 'cancelall', 'autopost', 'settimes', 'postnow', 'setchannel', 'findchannel', 'chatbot'];
            if (adminOnly.includes(cmd) && !admin) {
                await sock.sendMessage(from, { text: '❌ Owner only.' }, { quoted: msg });
                return;
            }
            const handled = await handleCommand(cmd, args, from, msg, admin);
            if (handled === null && admin) {
                await sock.sendMessage(from, { text: '❌ Unknown command. Send .menu' }, { quoted: msg });
            }
            return; // commands never trigger chatbot
        }

        // AI chatbot (global on/off, persistent)
        if ((await db.getSetting('chatbot')) === 'on') {
            if (!chatbotCmds.canReply(from)) return; // rate limit
            try {
                const reply = await aiChat.reply(text.slice(0, 500));
                await sock.sendMessage(from, { text: reply }, { quoted: msg });
            } catch (e) {
                console.error('[chatbot] reply failed:', e.message);
            }
        }
    } catch (e) {
        console.error('[onMessage]', e.message);
    }
}

async function start() {
    await db.init();
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ['SchedulerBot', 'Chrome', '1.0'],
    });
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (u) => {
        const { connection, lastDisconnect, qr } = u;
        if (qr) { console.log('Scan QR to pair:'); qrcode.generate(qr, { small: true }); }
        if (connection === 'open') {
            console.log('✅ Connected as', jidNormalizedUser(sock.user.id));
            scheduler.start(sock);
            channelPost.start(sock);
        }
        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            console.log('Connection closed:', code);
            if (code !== DisconnectReason.loggedOut) {
                console.log('Reconnecting in 5s...');
                setTimeout(start, 5000);
            } else {
                console.log('Logged out. Delete auth_info/ and restart to re-pair.');
            }
        }
    });

    sock.ev.on('messages.upsert', onMessage);
}

process.on('uncaughtException', e => console.error('[fatal]', e.message));
process.on('unhandledRejection', e => console.error('[unhandled]', e?.message || e));

start();
