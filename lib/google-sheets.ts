import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getAuth() {
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Google Service Account credentials missing in .env');
  }

  const credentials = {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };

  return new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
}

function getSheetsClient() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

const spreadsheetId = process.env.SPREADSHEET_ID;

// Types
export interface Board {
  id: string;
  title: string;
}

export interface List {
  id: string;
  title: string;
  position: number;
  boardId: string;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  is_checked: boolean;
  position: number;
  listId: string;
}

// Helpers
async function getSheetData(range: string) {
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID missing');
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return response.data.values || [];
}

async function appendRow(range: string, values: any[]) {
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID missing');
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [values],
    },
  });
}

async function updateRow(range: string, values: any[]) {
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID missing');
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [values],
    },
  });
}

async function clearRow(range: string) {
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID missing');
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range,
  });
}

// BOARDS
export async function getBoards(): Promise<Board[]> {
  const rows = await getSheetData('Boards!A2:B');
  return rows.map((row) => ({
    id: row[0] || '',
    title: row[1] || '',
  }));
}

export async function createBoard(board: Board) {
  await appendRow('Boards!A:B', [board.id, board.title]);
}

// LISTS
export async function getLists(): Promise<List[]> {
  const rows = await getSheetData('Lists!A2:D');
  return rows
    .filter((row) => row[0]) // ignore cleared rows
    .map((row) => ({
      id: row[0] || '',
      title: row[1] || '',
      position: parseInt(row[2] || '0', 10),
      boardId: row[3] || '',
    }));
}

export async function createList(list: List) {
  await appendRow('Lists!A:D', [list.id, list.title, list.position, list.boardId]);
}

export async function updateList(list: List) {
  const rows = await getSheetData('Lists!A1:A'); // Just getting IDs to find the row index
  const rowIndex = rows.findIndex((row) => row[0] === list.id);
  if (rowIndex > 0) {
    const range = `Lists!A${rowIndex + 1}:D${rowIndex + 1}`;
    await updateRow(range, [list.id, list.title, list.position, list.boardId]);
  }
}

export async function deleteList(listId: string) {
  const rows = await getSheetData('Lists!A1:A');
  const rowIndex = rows.findIndex((row) => row[0] === listId);
  if (rowIndex > 0) {
    const range = `Lists!A${rowIndex + 1}:D${rowIndex + 1}`;
    await clearRow(range);
  }
}

// CARDS
export async function getCards(): Promise<Card[]> {
  const rows = await getSheetData('Cards!A2:F');
  return rows
    .filter((row) => row[0]) // ignore cleared rows
    .map((row) => ({
      id: row[0] || '',
      title: row[1] || '',
      description: row[2] || '',
      is_checked: row[3] === 'TRUE' || row[3] === 'true',
      position: parseInt(row[4] || '0', 10),
      listId: row[5] || '',
    }));
}

export async function createCard(card: Card) {
  await appendRow('Cards!A:F', [
    card.id,
    card.title,
    card.description,
    card.is_checked,
    card.position,
    card.listId,
  ]);
}

export async function updateCard(card: Card) {
  const rows = await getSheetData('Cards!A1:A'); // Find row by ID
  const rowIndex = rows.findIndex((row) => row[0] === card.id);
  if (rowIndex > 0) {
    const range = `Cards!A${rowIndex + 1}:F${rowIndex + 1}`;
    await updateRow(range, [
      card.id,
      card.title,
      card.description,
      card.is_checked,
      card.position,
      card.listId,
    ]);
  }
}

export async function deleteCard(cardId: string) {
  const rows = await getSheetData('Cards!A1:A');
  const rowIndex = rows.findIndex((row) => row[0] === cardId);
  if (rowIndex > 0) {
    const range = `Cards!A${rowIndex + 1}:F${rowIndex + 1}`;
    await clearRow(range);
  }
}
