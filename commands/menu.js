/** .menu — command list */
async function menuCmd(sock, from, msg) {
    await sock.sendMessage(from, { text:
`╭━━━〔 🤖 *SCHEDULER BOT* 〕━━━┈⊷
┃
┃ ✦ .menu
┃ ✦ .ping
┃
╭━━━〔 ⚡ *SCHEDULER* 〕━━━┈⊷
┃ ✦ .schedule <num> | <time> | <msg>
┃ ✦ .schedules
┃ ✦ .cancel <id>
┃ ✦ .cancelall
┃
╭━━━〔 ⚡ *CHANNEL* 〕━━━┈⊷
┃ ✦ .channelstatus
┃ ✦ .autopost on/off
┃ ✦ .settimes 10:00,13:00,...
┃ ✦ .postnow
┃ ✦ .setchannel <jid>
┃ ✦ .findchannel <link>
┃
╭━━━〔 ⚡ *CHATBOT* 〕━━━┈⊷
┃ ✦ .chatbot on/off/status
┃
╰━━━━━━━━━━━━━━━━━━━━┈⊷
> *© PERSONAL BOT — MUAVIA*` }, { quoted: msg });
}

async function pingCmd(sock, from, msg) {
    const t = Date.now();
    await sock.sendMessage(from, { text: `🏓 Pong! ${Date.now() - t}ms` }, { quoted: msg });
}

module.exports = { menuCmd, pingCmd };
