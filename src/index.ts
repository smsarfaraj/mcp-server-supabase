import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerDatabaseTools } from "./tools/database.js";
import { registerAuthTools } from "./tools/auth.js";
import { registerStorageTools } from "./tools/storage.js";

async function main() {
  const server = new McpServer({
    name: "mcp-supabase",
    version: "1.0.0",
    description:
      "MCP server providing Claude with full access to Supabase — database CRUD, Auth management, and Storage operations.",
  });

  // Register all tool groups
  registerDatabaseTools(server);
  registerAuthTools(server);
  registerStorageTools(server);

  // Connect via stdio (works with Claude Desktop & Claude Code)
  const transport = new StdioServerTransport();

  // Log every tool call to stderr for visibility (stderr doesn't pollute the JSON-RPC stream)
  transport.onmessage = (msg) => {
    const m = msg as { method?: string; params?: { name?: string; arguments?: unknown } };
    if (m.method === "tools/call") {
      process.stderr.write(
        `\n[mcp-supabase] 🔧 Tool called: ${m.params?.name}\n` +
        `[mcp-supabase]    Args: ${JSON.stringify(m.params?.arguments, null, 2)}\n`
      );
    }
  };

  await server.connect(transport);
  process.stderr.write("[mcp-supabase] ✅ Server running on stdio — ready to receive tool calls\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});
