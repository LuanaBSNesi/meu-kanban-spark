/**
 * Exercises the MCP endpoint the same way Spark and Claude will: over HTTP,
 * with a Google bearer token.
 */
import 'dotenv/config';
import { authorizedClient } from '../lib/google/oauth';

const URL_MCP = process.env.MCP_URL ?? 'http://localhost:3000/api/mcp';

let id = 0;
let sessionId: string | undefined;

async function rpc(method: string, params?: unknown) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    Authorization: `Bearer ${token}`,
  };
  if (sessionId) headers['mcp-session-id'] = sessionId;

  const response = await fetch(URL_MCP, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
  });

  const sid = response.headers.get('mcp-session-id');
  if (sid) sessionId = sid;

  const raw = await response.text();
  if (!response.ok) throw new Error(`${method} -> HTTP ${response.status}: ${raw.slice(0, 200)}`);

  // Streamable HTTP answers as SSE; the JSON sits on the data: line.
  const line = raw.split('\n').find((l) => l.startsWith('data:'));
  const payload = JSON.parse(line ? line.slice(5).trim() : raw);
  if (payload.error) throw new Error(`${method} -> ${JSON.stringify(payload.error)}`);
  return payload.result;
}

async function callTool(name: string, args: Record<string, unknown> = {}) {
  const result = await rpc('tools/call', { name, arguments: args });
  const text = result?.content?.[0]?.text ?? '';
  if (result?.isError) throw new Error(`${name} falhou: ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

let token = '';

async function main() {
  const client = await authorizedClient();
  if (!client) throw new Error('Nenhuma conta Google conectada. Acesse /api/auth/google');
  const { token: accessToken } = await client.getAccessToken();
  if (!accessToken) throw new Error('Sem access_token');
  token = accessToken;

  await rpc('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'teste-local', version: '1.0.0' },
  });
  await fetch(URL_MCP, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${token}`,
      ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  });

  const { tools } = await rpc('tools/list');
  console.log(`ferramentas expostas (${tools.length}):`);
  for (const t of tools) console.log(`  - ${t.name}`);

  console.log('\n--- ciclo completo de autonomia do agente ---');

  const board = await callTool('create_board', { title: 'Quadro criado pelo agente' });
  console.log(`1. create_board  -> ${board.title} (${board.id})`);

  const renamed = await callTool('update_board', { boardId: board.id, title: 'Quadro renomeado' });
  console.log(`2. update_board  -> ${renamed.title}`);

  const todo = await callTool('create_list', { boardId: board.id, title: 'A fazer' });
  const doing = await callTool('create_list', { boardId: board.id, title: 'Fazendo' });
  console.log(`3. create_list   -> "${todo.title}" e "${doing.title}"`);

  const card = await callTool('create_card', { listId: todo.id, title: 'Primeira tarefa' });
  console.log(`4. create_card   -> ${card.title} (lista ${todo.title})`);

  const moved = await callTool('move_card', { cardId: card.id, listId: doing.id });
  console.log(`5. move_card     -> agora na lista ${moved.listId === doing.id ? doing.title : '???'}`);

  const checked = await callTool('update_card', { cardId: card.id, isChecked: true });
  console.log(`6. update_card   -> concluido = ${checked.isChecked}`);

  const state = await callTool('get_board_state', { boardId: board.id });
  console.log(`7. get_board_state -> ${state.lists.length} listas, ${state.lists.reduce((n: number, l: any) => n + l.cards.length, 0)} card(s)`);

  const boards = await callTool('list_boards');
  console.log(`8. list_boards   -> ${boards.length} quadro(s) no total`);

  await callTool('delete_board', { boardId: board.id });
  const after = await callTool('list_boards');
  console.log(`9. delete_board  -> restaram ${after.length} quadro(s)`);

  const sumiu = !after.some((b: { id: string }) => b.id === board.id);
  console.log(`\nquadro removido de verdade: ${sumiu ? 'sim' : 'NAO'}`);
}

main().catch((e) => {
  console.error('FALHOU:', e.message);
  process.exit(1);
});
