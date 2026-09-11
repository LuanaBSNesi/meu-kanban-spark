import {
  pgTable,
  uuid,
  text,
  boolean,
  doublePrecision,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// updated_at is stamped by a database trigger, never by the app: the client
// clock can drift behind the database clock, which would make a fresh update
// look older than an earlier insert and hide the change from the poller.
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const boards = pgTable('boards', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  ...timestamps,
});

export const lists = pgTable(
  'lists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    boardId: uuid('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    position: doublePrecision('position').notNull(),
    ...timestamps,
  },
  (t) => [index('lists_board_position_idx').on(t.boardId, t.position)],
);

export const cards = pgTable(
  'cards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listId: uuid('list_id')
      .notNull()
      .references(() => lists.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    isChecked: boolean('is_checked').notNull().default(false),
    position: doublePrecision('position').notNull(),
    dueAt: timestamp('due_at', { withTimezone: true }),
    driveFileId: text('drive_file_id'),
    ...timestamps,
  },
  (t) => [index('cards_list_position_idx').on(t.listId, t.position)],
);

export const boardsRelations = relations(boards, ({ many }) => ({
  lists: many(lists),
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
  board: one(boards, { fields: [lists.boardId], references: [boards.id] }),
  cards: many(cards),
}));

export const cardsRelations = relations(cards, ({ one }) => ({
  list: one(lists, { fields: [cards.listId], references: [lists.id] }),
}));

export type Board = typeof boards.$inferSelect;
export type List = typeof lists.$inferSelect;
export type Card = typeof cards.$inferSelect;
