/**
 * Mints a session cookie for the local dev server so the UI can be exercised
 * without running the Google consent flow in a throwaway browser.
 * Local only: it signs with the SESSION_SECRET from .env.
 */
import 'dotenv/config';
import { createSession } from '../lib/session';

async function main() {
  const email = process.env.OWNER_EMAIL;
  if (!email) throw new Error('OWNER_EMAIL missing');
  console.log(await createSession(email));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
