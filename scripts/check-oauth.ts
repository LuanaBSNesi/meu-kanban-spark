import 'dotenv/config';
import { desc } from 'drizzle-orm';
import { db } from '../lib/db';
import { oauthClients, oauthTokens } from '../lib/db/schema';

async function main() {
  const clients = await db.select().from(oauthClients).orderBy(desc(oauthClients.createdAt));
  console.log(`clientes registrados: ${clients.length}`);
  for (const c of clients) {
    console.log(`  "${c.clientName || '(sem nome)'}"  redirects: ${JSON.stringify(c.redirectUris)}`);
  }

  const tokens = await db.select().from(oauthTokens).orderBy(desc(oauthTokens.createdAt));
  console.log(`\ntokens emitidos: ${tokens.length}`);
  for (const t of tokens) {
    console.log(`  cliente=${t.clientId}  usuario=${t.userEmail}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
