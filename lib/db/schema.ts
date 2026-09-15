import {
  pgTable,
  uuid,
  text,
  boolean,
  doublePrecision,
  timestamp,
  index,
  jsonb,
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

/** Google OAuth tokens, one row per connected Google account. */
export const googleAccounts = pgTable('google_accounts', {
  email: text('email').primaryKey(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  scope: text('scope').notNull().default(''),
  ...timestamps,
});

/**
 * The app is its own OAuth authorization server. Gemini Spark only accepts an
 * MCP whose authorization server is the MCP itself, so pointing at Google was
 * refused; Google still proves who the user is, behind these endpoints.
 */
export const oauthClients = pgTable('oauth_clients', {
  clientId: text('client_id').primaryKey(),
  clientSecret: text('client_secret'),
  clientName: text('client_name').notNull().default(''),
  redirectUris: jsonb('redirect_uris').$type<string[]>().notNull(),
  ...timestamps,
});

export const oauthCodes = pgTable('oauth_codes', {
  code: text('code').primaryKey(),
  clientId: text('client_id').notNull(),
  redirectUri: text('redirect_uri').notNull(),
  codeChallenge: text('code_challenge'),
  codeChallengeMethod: text('code_challenge_method'),
  scope: text('scope').notNull().default(''),
  userEmail: text('user_email').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const oauthTokens = pgTable(
  'oauth_tokens',
  {
    token: text('token').primaryKey(),
    refreshToken: text('refresh_token'),
    clientId: text('client_id').notNull(),
    userEmail: text('user_email').notNull(),
    scope: text('scope').notNull().default(''),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('oauth_tokens_refresh_idx').on(t.refreshToken)],
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
