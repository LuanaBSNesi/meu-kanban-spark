/**
 * One-time import of the Google Sheets data into Neon.
 *
 * Run once:            npx tsx scripts/import-from-sheets.ts
 * Wipe and redo:       npx tsx scripts/import-from-sheets.ts --reset
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '../lib/db';
import { boards, cards, lists } from '../lib/db/schema';
import { getBoards, getCards, getLists } from '../lib/google-sheets';

const POSITION_GAP = 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sheet ids were hand-editable, so anything that is not a UUID gets a fresh one. */
function makeIdMapper() {
  const mapping = new Map<string, string>();
  return (sheetId: string) => {
    let id = mapping.get(sheetId);
    if (!id) {
      id = UUID_RE.test(sheetId) ? sheetId.toLowerCase() : randomUUID();
      mapping.set(sheetId, id);
    }
    return id;
  };
}

async function main() {
  const reset = process.argv.includes('--reset');

  if (reset) {
    console.log('Limpando tabelas...');
    await db.execute(sql`truncate table ${boards} restart identity cascade`);
  }

  const [existing] = await db.select({ n: sql<string>`count(*)` }).from(boards);
  if (Number(existing.n) > 0) {
    console.error(
      `O banco ja tem ${existing.n} quadro(s). Use --reset para apagar e reimportar.`,
    );
    process.exit(1);
  }

  console.log('Lendo a planilha...');
  const [sheetBoards, sheetLists, sheetCards] = await Promise.all([
    getBoards(),
    getLists(),
    getCards(),
  ]);

  // getBoards does not drop blank rows the way getLists/getCards do.
  const validBoards = sheetBoards.filter((b) => b.id && b.title);

  const mapBoardId = makeIdMapper();
  const mapListId = makeIdMapper();
  const mapCardId = makeIdMapper();

  const boardRows = validBoards.map((b) => ({ id: mapBoardId(b.id), title: b.title }));
  const boardIds = new Set(boardRows.map((b) => b.id));

  const listRows = sheetLists
    .filter((l) => boardIds.has(mapBoardId(l.boardId)))
    .map((l) => ({
      id: mapListId(l.id),
      boardId: mapBoardId(l.boardId),
      title: l.title || 'Sem titulo',
      position: (l.position + 1) * POSITION_GAP,
    }));
  const listIds = new Set(listRows.map((l) => l.id));

  const cardRows = sheetCards
    .filter((c) => listIds.has(mapListId(c.listId)))
    .map((c) => ({
      id: mapCardId(c.id),
      listId: mapListId(c.listId),
      title: c.title || 'Sem titulo',
      description: c.description || '',
      isChecked: c.is_checked,
      position: (c.position + 1) * POSITION_GAP,
    }));

  const orphanLists = sheetLists.length - listRows.length;
  const orphanCards = sheetCards.length - cardRows.length;

  if (boardRows.length) await db.insert(boards).values(boardRows);
  if (listRows.length) await db.insert(lists).values(listRows);
  if (cardRows.length) await db.insert(cards).values(cardRows);

  console.log(`\nImportado para o Neon:`);
  console.log(`  quadros: ${boardRows.length}  (planilha: ${sheetBoards.length})`);
  console.log(`  listas:  ${listRows.length}  (planilha: ${sheetLists.length})`);
  console.log(`  cards:   ${cardRows.length}  (planilha: ${sheetCards.length})`);

  if (orphanLists || orphanCards) {
    console.log(
      `\nDescartados por apontarem para um pai inexistente: ${orphanLists} lista(s), ${orphanCards} card(s).`,
    );
    console.log('Sao os orfaos que o deleteList antigo deixava para tras na planilha.');
  }
}

main().catch((error) => {
  console.error('Falha na importacao:', error);
  process.exit(1);
});
