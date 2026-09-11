import 'dotenv/config';
import { db } from '../lib/db';
import { googleAccounts } from '../lib/db/schema';

async function main() {
  const rows = await db.select().from(googleAccounts);
  console.log('contas conectadas:', rows.length);
  for (const r of rows) {
    console.log('  email:', r.email);
    console.log('  tem refresh_token:', Boolean(r.refreshToken));
    console.log('  escopos:', r.scope);
    console.log('  access_token expira:', r.expiresAt?.toISOString() ?? '(sem data)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
