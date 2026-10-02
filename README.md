# MR MUAVIA SCHEDULER BOT (Personal)

Personal WhatsApp bot: **message scheduler**, **WhatsApp Channel auto-posting** (Gemini AI images), **AI chatbot**. Separate project — does not touch MR MUAVIA MD BOT.

## Features
- `.schedule` — schedule a WhatsApp message to any number (persistent, restart-safe)
- Channel auto-posting — 4–5 AI image posts/day at configurable times
- `.chatbot on/off` — AI auto-reply with rate limiting
- Gemini image generation (free key, no card)

## 1. Installation (Termux / Android)

```bash
pkg install nodejs git -y
git clone https://github.com/mrkhan9496/mr-muavia-scheduler-bot
cd mr-muavia-scheduler-bot
npm install
cp .env.example .env
```

Edit `.env` (use any text editor):

```bash
nano .env
```

Fill in: `OWNER_NUMBER`, `GEMINI_API_KEY`, `CHANNEL_JID`, `DATABASE_URL` (optional).

Start:

```bash
npm start
```

Scan the QR with WhatsApp (Linked Devices). Done.

## 2. Environment variables

| Variable | What it does |
|---|---|
| OWNER_NUMBER | Your WhatsApp number (owner commands) |
| DATABASE_URL | Neon Postgres URL (optional; file fallback otherwise) |
| GEMINI_API_KEY | Free key from https://aistudio.google.com/apikey |
| GEMINI_IMAGE_MODEL | Image model (default `gemini-2.5-flash-image`) |
| GEMINI_CHAT_MODEL | Chat model (default `gemini-2.5-flash`) |
| AI_API_KEY / AI_BASE_URL / AI_MODEL | Optional chatbot fallback |
| CHANNEL_JID | Your channel JID, e.g. `1203630XXX@newsletter` |
| TIMEZONE | Default `Asia/Karachi` |
| PORT | Default 3000 |

## 3. Gemini API setup
1. Go to https://aistudio.google.com/apikey
2. Sign in with Google → Create API key (free, no credit card)
3. Put it in `.env` as `GEMINI_API_KEY=...`

## 4. WhatsApp Channel configuration
1. Create a channel in WhatsApp, make the bot's number an **admin**.
2. Get the channel JID: open channel info — or set via command:
   `.setchannel 1203630XXXX@newsletter`
   Or set `CHANNEL_JID=` in `.env`.
3. Check: `.channelstatus`

## 5. Scheduler usage
```
.schedule 923001234567 | 08:30 PM | Assalam o Alaikum!
.schedule 923001234567 | 2026-10-03 20:30 | Reminder
.schedules
.cancel sch_abc123
.cancelall
```
Schedules survive restarts (Postgres or local file). Failed sends retry 3x.

## 6. Channel auto-posting setup
```
.autopost on
.settimes 10:00,13:00,16:00,19:00,22:00
.postnow        (post immediately)
.channelstatus  (see status, next post, errors)
```

## 7. Chatbot
```
.chatbot on
.chatbot off
.chatbot status
```
When ON, the bot AI-replies to normal messages (commands still work, own messages ignored, 5s rate limit per chat).

## 8. Restart
```bash
# Termux: stop with Ctrl+C, start again:
npm start
```
Scheduler + chatbot state reload automatically.

## 9. Troubleshooting
- **QR not showing**: delete `auth_info/` and restart.
- **Gemini 403**: key invalid — regenerate at AI Studio.
- **Channel post fails**: bot must be channel **admin**; check `.channelstatus` error line.
- **Schedule not sent**: check `.schedules` — status `failed`/`dead` shows error.
- **No DATABASE_URL**: file mode is used (`data/bot_data.json`) — works, but use Postgres on Railway for safety.
