import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export async function sendDeletionRequestEmail({ matchId, matchDescription }) {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn('EmailJS není nakonfigurován (chybí VITE_EMAILJS_* proměnné) — e-mail nebyl odeslán.');
    return;
  }
  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    { match_id: matchId, match_description: matchDescription },
    { publicKey: PUBLIC_KEY },
  );
}
