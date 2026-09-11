import 'dotenv/config';
import { eq, sql } from 'drizzle-orm';
import { db } from '../lib/db';
import { boards, cards, lists } from '../lib/db/schema';
import { getBoardVersion } from '../lib/db/queries';

async function count(table: typeof boards | typeof lists | typeof cards) {
  const [row] = await db.select({ n: sql<string>`count(*)` }).from(table);
  return Number(row.n);
}

async function main() {
  console.log('--- Conteudo importado ---');
  const all = await db.query.boards.findMany({ with: { lists: { with: { cards: true } } } });
  for (const b of all) {
    console.log(`quadro "${b.title}" (${b.id})`);
    for (const l of b.lists) {
      console.log(`  lista "${l.title}" pos=${l.position}`);
      for (const c of l.cards) console.log(`    card "${c.title}" pos=${c.position}`);
    }
  }

  console.log('\n--- Teste de ON DELETE CASCADE ---');
  const [tmpBoard] = await db.insert(boards).values({ title: '__teste_cascade__' }).returning();
  const [tmpList] = await db
    .insert(lists)
    .values({ boardId: tmpBoard.id, title: 'lista temp', position: 1 })
    .returning();
  await db.insert(cards).values([
    { listId: tmpList.id, title: 'card A', position: 1 },
    { listId: tmpList.id, title: 'card B', position: 2 },
  ]);

  const before = await count(cards);
  console.log(`cards antes de apagar a lista: ${before}`);

  await db.delete(lists).where(eq(lists.id, tmpList.id));
  const afterList = await count(cards);
  console.log(`cards depois de apagar a lista: ${afterList}  (esperado: ${before - 2})`);

  const versionBefore = await getBoardVersion(tmpBoard.id);
  await db.delete(boards).where(eq(boards.id, tmpBoard.id));
  const leftover = await db.select().from(lists).where(eq(lists.boardId, tmpBoard.id));
  console.log(`listas orfas depois de apagar o quadro: ${leftover.length}  (esperado: 0)`);

  console.log('\n--- Versao para sondagem ---');
  const real = all[0];
  if (real) {
    const v1 = await getBoardVersion(real.id);
    const firstCard = real.lists[0]?.cards[0];
    if (firstCard) {
      await db.delete(cards).where(eq(cards.id, firstCard.id));
      const v2 = await getBoardVersion(real.id);
      console.log(`antes da exclusao: ${v1}`);
      console.log(`depois da exclusao: ${v2}`);
      console.log(v1 === v2 ? 'FALHOU: exclusao nao mudou a versao' : 'OK: exclusao mudou a versao');
      await db
        .insert(cards)
        .values({
          id: firstCard.id,
          listId: firstCard.listId,
          title: firstCard.title,
          description: firstCard.description,
          isChecked: firstCard.isChecked,
          position: firstCard.position,
        });
      console.log('card restaurado');
    }
  }
  console.log(`versao do quadro temporario apagado: ${versionBefore ? 'tinha valor' : 'null'}`);

  console.log('\n--- Totais finais ---');
  console.log(`quadros=${await count(boards)} listas=${await count(lists)} cards=${await count(cards)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
