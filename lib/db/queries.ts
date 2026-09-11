import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from './index';
import { boards, cards, lists, type Card, type List } from './schema';

const POSITION_GAP = 1024;

export type BoardWithLists = Awaited<ReturnType<typeof getBoardWithLists>>;

/** Position that places a new item after every sibling in the list. */
async function nextListPosition(boardId: string) {
  const [row] = await db
    .select({ max: sql<number | null>`max(${lists.position})` })
    .from(lists)
    .where(eq(lists.boardId, boardId));
  return (row?.max ?? 0) + POSITION_GAP;
}

async function nextCardPosition(listId: string) {
  const [row] = await db
    .select({ max: sql<number | null>`max(${cards.position})` })
    .from(cards)
    .where(eq(cards.listId, listId));
  return (row?.max ?? 0) + POSITION_GAP;
}

// BOARDS

export function listBoards() {
  return db.select().from(boards).orderBy(asc(boards.createdAt));
}

export async function getBoardWithLists(boardId: string) {
  return db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    with: {
      lists: {
        orderBy: asc(lists.position),
        with: { cards: { orderBy: asc(cards.position) } },
      },
    },
  });
}

export async function createBoard(title: string) {
  const [board] = await db.insert(boards).values({ title }).returning();
  return board;
}

export async function updateBoard(boardId: string, patch: { title?: string }) {
  const [board] = await db
    .update(boards)
    .set(patch)
    .where(eq(boards.id, boardId))
    .returning();
  return board;
}

/** Cascades to the board's lists and their cards via the FK constraint. */
export async function deleteBoard(boardId: string) {
  const [board] = await db.delete(boards).where(eq(boards.id, boardId)).returning();
  return board;
}

// LISTS

export async function createList(boardId: string, title: string, position?: number) {
  const [list] = await db
    .insert(lists)
    .values({ boardId, title, position: position ?? (await nextListPosition(boardId)) })
    .returning();
  return list;
}

export async function updateList(listId: string, patch: Partial<Pick<List, 'title' | 'position'>>) {
  const [list] = await db.update(lists).set(patch).where(eq(lists.id, listId)).returning();
  return list;
}

/** Cascades to the list's cards via the FK constraint. */
export async function deleteList(listId: string) {
  const [list] = await db.delete(lists).where(eq(lists.id, listId)).returning();
  return list;
}

// CARDS

export async function createCard(
  listId: string,
  values: { title: string; description?: string; position?: number; dueAt?: Date | null },
) {
  const [card] = await db
    .insert(cards)
    .values({
      listId,
      title: values.title,
      description: values.description ?? '',
      dueAt: values.dueAt ?? null,
      position: values.position ?? (await nextCardPosition(listId)),
    })
    .returning();
  return card;
}

export async function updateCard(
  cardId: string,
  patch: Partial<Pick<Card, 'title' | 'description' | 'isChecked' | 'position' | 'listId' | 'dueAt' | 'driveFileId'>>,
) {
  const [card] = await db.update(cards).set(patch).where(eq(cards.id, cardId)).returning();
  return card;
}

export async function deleteCard(cardId: string) {
  const [card] = await db.delete(cards).where(eq(cards.id, cardId)).returning();
  return card;
}

/**
 * Position that drops a card between two siblings, so a drag writes one row
 * instead of renumbering the whole list.
 */
export async function positionBetween(listId: string, afterCardId?: string | null) {
  const siblings = await db
    .select({ id: cards.id, position: cards.position })
    .from(cards)
    .where(eq(cards.listId, listId))
    .orderBy(asc(cards.position));

  if (!afterCardId) {
    const first = siblings[0];
    return first ? first.position / 2 : POSITION_GAP;
  }

  const index = siblings.findIndex((c) => c.id === afterCardId);
  if (index === -1) return (siblings.at(-1)?.position ?? 0) + POSITION_GAP;

  const after = siblings[index];
  const next = siblings[index + 1];
  return next ? (after.position + next.position) / 2 : after.position + POSITION_GAP;
}

/**
 * Cheap change-detection token for polling. Counts are part of it because a
 * deletion leaves no row whose updated_at could move.
 */
export async function getBoardVersion(boardId: string) {
  const result = await db.execute<{
    updated_at: string | null;
    list_count: string;
    card_count: string;
  }>(sql`
    select
      greatest(
        (select max(updated_at) from boards where id = ${boardId}),
        (select max(l.updated_at) from lists l where l.board_id = ${boardId}),
        (select max(c.updated_at) from cards c
           join lists l on c.list_id = l.id where l.board_id = ${boardId})
      ) as updated_at,
      (select count(*) from lists l where l.board_id = ${boardId}) as list_count,
      (select count(*) from cards c
         join lists l on c.list_id = l.id where l.board_id = ${boardId}) as card_count
  `);

  const row = result.rows[0];
  if (!row?.updated_at) return null;
  return `${row.updated_at}:${row.list_count}:${row.card_count}`;
}

export async function cardExists(cardId: string) {
  const [row] = await db.select({ id: cards.id }).from(cards).where(eq(cards.id, cardId));
  return Boolean(row);
}

export async function listExists(boardId: string, listId: string) {
  const [row] = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.id, listId), eq(lists.boardId, boardId)));
  return Boolean(row);
}
