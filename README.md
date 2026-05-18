# mcp-supabase

> **An MCP Server that gives Claude full access to your Supabase database.**  
> Built by [Sarfaraz Shaikh](https://sarfaraz.pro)

---

## What is this?

This is a **Model Context Protocol (MCP) Server** built in TypeScript. It connects to your Supabase project and exposes 18 tools that Claude (or any MCP client) can call to interact with your database, manage users, and work with file storage — all through natural language.

### What is MCP?

MCP (Model Context Protocol) is an open standard by Anthropic that lets AI models like Claude connect to external systems through a defined tool interface. Think of it as a plugin system for Claude.

```
Claude (AI)
    ↓  JSON-RPC over stdio
mcp-supabase (this server)
    ↓  HTTPS REST API
Supabase (your database in the cloud)
```

When you ask Claude *"How many users signed up this week?"*, Claude calls the `auth_list_users` tool on this server, this server queries Supabase, and Claude returns the answer.

---

## Features

### Database Tools (5 tools)
| Tool | Description |
|------|-------------|
| `db_list_tables` | List all tables and their columns in your public schema |
| `db_query` | SELECT rows with filters, ordering, and pagination |
| `db_insert` | INSERT (or UPSERT) one or more rows |
| `db_update` | UPDATE rows matching a filter |
| `db_delete` | DELETE rows matching a filter |
| `db_rpc` | Call a Postgres function via RPC |

### Auth Tools (6 tools)
| Tool | Description |
|------|-------------|
| `auth_list_users` | List all registered users |
| `auth_get_user` | Get a specific user by UUID |
| `auth_create_user` | Create a new user |
| `auth_update_user` | Update email, password, metadata, or ban status |
| `auth_delete_user` | Permanently delete a user |
| `auth_generate_magic_link` | Generate a one-time magic login link |

### Storage Tools (7 tools)
| Tool | Description |
|------|-------------|
| `storage_list_buckets` | List all storage buckets |
| `storage_list_files` | List files inside a bucket/folder |
| `storage_get_public_url` | Get the public URL for a file |
| `storage_create_signed_url` | Create a time-limited private URL |
| `storage_upload_from_url` | Upload a file from a remote URL |
| `storage_move_file` | Move or rename a file |
| `storage_delete_files` | Delete one or more files |

---

## Tech Stack

- **Runtime:** Node.js (v18+)
- **Language:** TypeScript
- **MCP SDK:** `@modelcontextprotocol/sdk`
- **Database:** `@supabase/supabase-js`
- **Validation:** `zod`
- **Transport:** stdio (JSON-RPC)

---

## Prerequisites

- Node.js v18 or higher
- A Supabase project ([create one free](https://supabase.com))
- Claude Desktop or any MCP-compatible client

---

## Installation

```bash
# 1. Clone the repo
git clone https://github.com/your-username/mcp-supabase.git
cd mcp-supabase

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
```

Open `.env` and fill in your Supabase credentials:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> **Where to find them:** Supabase Dashboard → Settings → API  
> Use the `service_role` key — it gives full admin access and bypasses Row Level Security.  
> **Never commit your `.env` file.**

```bash
# 4. Build
npm run build
```

---

## Connecting to Claude Desktop

Open your Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the following:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-supabase/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

Restart Claude Desktop. The 18 tools will appear in the tools menu (🔨 icon).

---

## Connecting to Claude Code

Create or edit `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-supabase/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

Verify:
```bash
claude mcp list
```

---

## Example Prompts

Once connected to Claude Desktop, try these:

```
"What tables do I have in my database?"
"Query the users table and show me the 10 most recent signups"
"How many active users do I have in Supabase Auth?"
"Generate a magic login link for user@example.com"
"List all files in the avatars storage bucket"
"Insert a new product with name='Widget' and price=9.99 into the products table"
```

---

## How It Works

The server runs as a child process and communicates over `stdio` using the JSON-RPC protocol defined by MCP. Claude Desktop (or any MCP client) spawns the server, sends tool call requests as JSON messages, and reads back the results.

```
Claude Desktop
  → spawn: node dist/index.js
  → stdin:  {"method":"tools/call","params":{"name":"db_query","arguments":{...}}}
  ← stdout: {"result":{"content":[{"type":"text","text":"..."}]}}
```

Credentials are injected as environment variables by the host — no `.env` file needed at runtime.

---

## Project Structure

```
mcp-supabase/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── supabase.ts       # Supabase client setup
│   └── tools/
│       ├── database.ts   # db_* tools
│       ├── auth.ts       # auth_* tools
│       └── storage.ts    # storage_* tools
├── dist/                 # Compiled output (git-ignored)
├── .env.example          # Environment variable template
├── package.json
└── tsconfig.json
```

---

## Security Notes

- This server uses the **service role key** which bypasses Supabase Row Level Security. Only use it in trusted environments.
- Never expose this server publicly over HTTP without authentication.
- Always use environment variables for credentials — never hardcode them.

---

## Related Project

**[mcp-client](https://github.com/your-username/mcp-client)** — The companion MCP client with a web UI. Features two modes: Chat with Claude (AI-driven) and MCP Inspector (direct tool calls without AI).

---

## Author

**Sarfaraz Shaikh**  
[sarfaraz.pro](https://sarfaraz.pro) · [LinkedIn](https://linkedin.com/in/sarfaraz-shaikh)

---

## License

MIT
