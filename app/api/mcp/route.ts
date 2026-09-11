import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { z } from 'zod';
import {
  createBoard,
  createCard,
  createList,
  deleteBoard,
  deleteCard,
  deleteList,
  getBoardWithLists,
  listBoards,
  positionBetween,
  updateBoard,
  updateCard,
  updateList,
} from '@/lib/db/queries';
import { emailForAccessToken, ownerEmail } from '@/lib/google/oauth';

function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

const handler = createMcpHandler((server) => {
  server.registerTool(
    'list_boards',
    {
      description: 'Lista todos os quadros do kanban, com id e titulo.',
      inputSchema: {},
    },
    async () => ok(await listBoards()),
  );

  server.registerTool(
    'get_board_state',
    {
      description:
        'Estado completo de um quadro: suas listas e os cards de cada lista, ja ordenados por posicao.',
      inputSchema: { boardId: z.string().describe('UUID do quadro') },
    },
    async ({ boardId }) => {
      const board = await getBoardWithLists(boardId);
      return board ? ok(board) : fail('Quadro nao encontrado');
    },
  );

  server.registerTool(
    'create_board',
    { description: 'Cria um quadro.', inputSchema: { title: z.string().min(1) } },
    async ({ title }) => ok(await createBoard(title)),
  );

  server.registerTool(
    'update_board',
    {
      description: 'Renomeia um quadro.',
      inputSchema: { boardId: z.string(), title: z.string().min(1) },
    },
    async ({ boardId, title }) => {
      const board = await updateBoard(boardId, { title });
      return board ? ok(board) : fail('Quadro nao encontrado');
    },
  );

  server.registerTool(
    'delete_board',
    {
      description: 'Exclui um quadro. Suas listas e cards vao junto, por constraint do banco.',
      inputSchema: { boardId: z.string() },
      annotations: { destructiveHint: true },
    },
    async ({ boardId }) => {
      const board = await deleteBoard(boardId);
      return board ? ok({ deleted: board.id }) : fail('Quadro nao encontrado');
    },
  );

  server.registerTool(
    'create_list',
    {
      description: 'Cria uma lista num quadro. Sem position, vai para o fim.',
      inputSchema: {
        boardId: z.string(),
        title: z.string().min(1),
        position: z.number().optional(),
      },
    },
    async ({ boardId, title, position }) => ok(await createList(boardId, title, position)),
  );

  server.registerTool(
    'update_list',
    {
      description: 'Renomeia ou reposiciona uma lista.',
      inputSchema: {
        listId: z.string(),
        title: z.string().min(1).optional(),
        position: z.number().optional(),
      },
    },
    async ({ listId, ...patch }) => {
      const list = await updateList(listId, patch);
      return list ? ok(list) : fail('Lista nao encontrada');
    },
  );

  server.registerTool(
    'delete_list',
    {
      description: 'Exclui uma lista. Os cards dela vao junto, por constraint do banco.',
      inputSchema: { listId: z.string() },
      annotations: { destructiveHint: true },
    },
    async ({ listId }) => {
      const list = await deleteList(listId);
      return list ? ok({ deleted: list.id }) : fail('Lista nao encontrada');
    },
  );

  server.registerTool(
    'create_card',
    {
      description: 'Cria um card numa lista. Sem position, vai para o fim.',
      inputSchema: {
        listId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        position: z.number().optional(),
      },
    },
    async ({ listId, ...values }) => ok(await createCard(listId, values)),
  );

  server.registerTool(
    'update_card',
    {
      description: 'Altera titulo, descricao ou estado de conclusao de um card.',
      inputSchema: {
        cardId: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        isChecked: z.boolean().optional(),
      },
    },
    async ({ cardId, ...patch }) => {
      const card = await updateCard(cardId, patch);
      return card ? ok(card) : fail('Card nao encontrado');
    },
  );

  server.registerTool(
    'move_card',
    {
      description:
        'Move um card para uma lista. Informe afterCardId para posiciona-lo logo depois daquele card; omita para deixa-lo no topo.',
      inputSchema: {
        cardId: z.string(),
        listId: z.string(),
        afterCardId: z.string().nullish(),
      },
    },
    async ({ cardId, listId, afterCardId }) => {
      const position = await positionBetween(listId, afterCardId);
      const card = await updateCard(cardId, { listId, position });
      return card ? ok(card) : fail('Card nao encontrado');
    },
  );

  server.registerTool(
    'delete_card',
    {
      description: 'Exclui um card.',
      inputSchema: { cardId: z.string() },
      annotations: { destructiveHint: true },
    },
    async ({ cardId }) => {
      const card = await deleteCard(cardId);
      return card ? ok({ deleted: card.id }) : fail('Card nao encontrado');
    },
  );
});

/**
 * The endpoint is public on the internet, so every call must prove it belongs
 * to the owner. Spark only speaks OAuth, and Google is already the identity
 * provider for Drive, so the same client secures both.
 */
const authenticated = withMcpAuth(
  handler,
  async (_req, bearerToken) => {
    if (!bearerToken) return undefined;
    try {
      const email = await emailForAccessToken(bearerToken);
      if (email !== ownerEmail()) return undefined;
      return {
        token: bearerToken,
        scopes: ['kanban'],
        clientId: email,
        extra: { email },
      };
    } catch {
      return undefined;
    }
  },
  { required: true },
);

export { authenticated as GET, authenticated as POST, authenticated as DELETE };
