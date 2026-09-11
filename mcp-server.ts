import 'dotenv/config';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import { 
  getBoards, 
  getLists, 
  getCards, 
  createBoard, 
  createList, 
  updateList, 
  deleteList,
  createCard, 
  updateCard, 
  deleteCard,
  Board, 
  List, 
  Card 
} from './lib/google-sheets'; // using relative path for standalone run

const server = new Server(
  {
    name: "xcntrx-kanban-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_board_state",
        description: "Returns the complete state of a Kanban board including its lists and cards ordered by position.",
        inputSchema: {
          type: "object",
          properties: {
            boardId: { type: "string", description: "The UUID of the board" }
          },
          required: ["boardId"]
        }
      },
      {
        name: "create_board",
        description: "Creates a new Kanban board.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" }
          },
          required: ["id", "title"]
        }
      },
      {
        name: "create_list",
        description: "Creates a new list in a board.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
            boardId: { type: "string" },
            title: { type: "string" },
            position: { type: "number" }
          },
          required: ["id", "boardId", "title", "position"]
        }
      },
      {
        name: "update_list_position",
        description: "Updates a list position and title.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
            boardId: { type: "string" },
            title: { type: "string" },
            position: { type: "number" }
          },
          required: ["id", "boardId", "title", "position"]
        }
      },
      {
        name: "delete_list",
        description: "Deletes a list and implicitly all its cards.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" }
          },
          required: ["id"]
        }
      },
      {
        name: "create_card",
        description: "Creates a new card in a list.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
            listId: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            position: { type: "number" },
            is_checked: { type: "boolean" }
          },
          required: ["id", "listId", "title", "position"]
        }
      },
      {
        name: "move_card",
        description: "Updates a card's position and listId (for drag and drop).",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
            listId: { type: "string" },
            title: { type: "string" },
            position: { type: "number" },
            description: { type: "string" },
            is_checked: { type: "boolean" }
          },
          required: ["id", "listId", "title", "position"]
        }
      },
      {
        name: "toggle_card_check",
        description: "Toggles the check state of a card.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
            is_checked: { type: "boolean" }
          },
          required: ["id", "is_checked"]
        }
      },
      {
        name: "delete_card",
        description: "Deletes a card.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" }
          },
          required: ["id"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "get_board_state": {
        const { boardId } = request.params.arguments as any;
        const boards = await getBoards();
        const board = boards.find(b => b.id === boardId);
        if (!board) throw new Error("Board not found");
        
        const allLists = await getLists();
        const allCards = await getCards();

        const lists = allLists
          .filter(l => l.boardId === boardId)
          .sort((a, b) => a.position - b.position)
          .map(list => ({
            ...list,
            cards: allCards
              .filter(c => c.listId === list.id)
              .sort((a, b) => a.position - b.position)
          }));
          
        return { content: [{ type: "text", text: JSON.stringify({ board, lists }, null, 2) }] };
      }
      
      case "create_board": {
        const args = request.params.arguments as any;
        await createBoard(args);
        return { content: [{ type: "text", text: "Board created successfully" }] };
      }

      case "create_list": {
        const args = request.params.arguments as any;
        await createList(args);
        return { content: [{ type: "text", text: "List created successfully" }] };
      }

      case "update_list_position": {
        const args = request.params.arguments as any;
        await updateList(args);
        return { content: [{ type: "text", text: "List updated successfully" }] };
      }

      case "delete_list": {
        const { id } = request.params.arguments as any;
        await deleteList(id);
        return { content: [{ type: "text", text: "List deleted successfully" }] };
      }

      case "create_card": {
        const args = request.params.arguments as any;
        if (args.is_checked === undefined) args.is_checked = false;
        if (!args.description) args.description = '';
        await createCard(args);
        return { content: [{ type: "text", text: "Card created successfully" }] };
      }

      case "move_card": {
        const args = request.params.arguments as any;
        if (args.is_checked === undefined) args.is_checked = false;
        if (!args.description) args.description = '';
        await updateCard(args);
        return { content: [{ type: "text", text: "Card moved successfully" }] };
      }

      case "toggle_card_check": {
        const { id, is_checked } = request.params.arguments as any;
        const allCards = await getCards();
        const card = allCards.find(c => c.id === id);
        if (!card) throw new Error("Card not found");
        card.is_checked = is_checked;
        await updateCard(card);
        return { content: [{ type: "text", text: `Card check toggled to ${is_checked}` }] };
      }

      case "delete_card": {
        const { id } = request.params.arguments as any;
        await deleteCard(id);
        return { content: [{ type: "text", text: "Card deleted successfully" }] };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
    }
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("XCNTRX MCP Server running on stdio");
}

main().catch(console.error);
