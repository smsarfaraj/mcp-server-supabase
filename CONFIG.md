# Setup & Configuration Guide

## 1. Install dependencies

```bash
cd mcp-supabase
npm install
npm run build
```

## 2. Create your .env file

```bash
cp .env.example .env
```

Open `.env` and fill in your real Supabase credentials:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...your-service-role-key
```

> **Where to find them:** Supabase Dashboard → Settings → API  
> Use the **service_role** key (NOT the anon key). It bypasses Row Level Security.

---

## 3. Connect to Claude Desktop

Open (or create) your Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the following inside the `"mcpServers"` object:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["/Users/sarfarazshaikh/Documents/Claude/Projects/Learn-GenAI/mcp-supabase/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project-id.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

Restart Claude Desktop. You should see the tools appear in the tools list (hammer icon).

---

## 4. Connect to Claude Code

In your project root (or home directory), create/edit `.mcp.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["/Users/sarfarazshaikh/Documents/Claude/Projects/Learn-GenAI/mcp-supabase/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project-id.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

Then verify it's connected:

```bash
claude mcp list
```

---

## 5. Available Tools

### Database
| Tool | Description |
|------|-------------|
| `db_query` | SELECT rows with filters, ordering, pagination |
| `db_insert` | INSERT (or UPSERT) one or more rows |
| `db_update` | UPDATE rows matching a column/value filter |
| `db_delete` | DELETE rows matching a column/value filter |
| `db_rpc` | Call a Postgres function via RPC |

### Auth
| Tool | Description |
|------|-------------|
| `auth_list_users` | List all registered users |
| `auth_get_user` | Get a user by UUID |
| `auth_create_user` | Create a new user |
| `auth_update_user` | Update email, password, metadata, or ban status |
| `auth_delete_user` | Permanently delete a user |
| `auth_generate_magic_link` | Generate a one-time magic login link |

### Storage
| Tool | Description |
|------|-------------|
| `storage_list_buckets` | List all buckets |
| `storage_list_files` | List files in a bucket/folder |
| `storage_get_public_url` | Get the public URL for a file |
| `storage_create_signed_url` | Create a time-limited private URL |
| `storage_upload_from_url` | Upload a file from a remote URL |
| `storage_move_file` | Move or rename a file |
| `storage_delete_files` | Delete one or more files |

---

## 6. Example prompts you can use with Claude

Once connected, try these in Claude:

- *"Query the `users` table where role is 'admin'"*
- *"Insert a new product into the `products` table with name 'Widget' and price 9.99"*
- *"List all users in Supabase Auth who signed up this week"*
- *"Generate a magic login link for user@example.com"*
- *"List all files in the 'avatars' bucket"*
- *"Get a signed URL for the file images/photo.jpg in bucket 'uploads'"*
