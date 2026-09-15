/**
 * Removes registered clients that never obtained a token. Each agent retried
 * registration a few times while the server was being fixed, leaving rows that
 * nothing references.
 */
import 'dotenv/config';
import { inArray, notInArray } from 'drizzle-orm';
import { db } from '../lib/db';
import { oauthClients, oauthTokens } from '../lib/db/schema';

async function main() {
  const inUse = await db.selectDistinct({ clientId: oauthTokens.clientId }).from(oauthTokens);
  const keep = inUse.map((r) => r.clientId);
  console.log(`clientes com token ativo: ${keep.length}`);

  const removed = keep.length
    ? await db.delete(oauthClients).where(notInArray(oauthClients.clientId, keep)).returning()
    : [];

  console.log(`clientes sem token removidos: ${removed.length}`);
  for (const c of removed) console.log(`  "${c.clientName}"`);

  const left = await db.select().from(oauthClients);
  console.log(`\nrestaram: ${left.map((c) => `"${c.clientName}"`).join(', ')}`);
  void inArray;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
