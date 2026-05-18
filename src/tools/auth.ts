import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabase } from "../supabase.js";

export function registerAuthTools(server: McpServer) {
  // ─── List Users ───────────────────────────────────────────────────────────
  server.tool(
    "auth_list_users",
    "List all users registered in Supabase Auth.",
    {
      page: z.number().optional().default(1).describe("Page number (1-based)"),
      per_page: z.number().optional().default(50).describe("Users per page (max 1000)"),
    },
    async ({ page, per_page }) => {
      const { data, error } = await supabase.auth.admin.listUsers({
        page: page ?? 1,
        perPage: per_page ?? 50,
      });

      if (error) throw new Error(`Auth list users error: ${error.message}`);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                users: data.users.map((u) => ({
                  id: u.id,
                  email: u.email,
                  phone: u.phone,
                  role: u.role,
                  created_at: u.created_at,
                  last_sign_in_at: u.last_sign_in_at,
                  confirmed: u.email_confirmed_at != null,
                  app_metadata: u.app_metadata,
                  user_metadata: u.user_metadata,
                })),
                total: data.users.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ─── Get User by ID ───────────────────────────────────────────────────────
  server.tool(
    "auth_get_user",
    "Get a specific user by their UUID from Supabase Auth.",
    {
      user_id: z.string().uuid().describe("The user's UUID"),
    },
    async ({ user_id }) => {
      const { data, error } = await supabase.auth.admin.getUserById(user_id);
      if (error) throw new Error(`Auth get user error: ${error.message}`);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data.user, null, 2),
          },
        ],
      };
    }
  );

  // ─── Create User ──────────────────────────────────────────────────────────
  server.tool(
    "auth_create_user",
    "Create a new user in Supabase Auth.",
    {
      email: z.string().email().describe("User's email address"),
      password: z.string().min(6).describe("User's password (min 6 chars)"),
      email_confirmed: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to mark the email as confirmed immediately"),
      user_metadata: z
        .record(z.unknown())
        .optional()
        .describe("Additional metadata to store on the user"),
    },
    async ({ email, password, email_confirmed, user_metadata }) => {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: email_confirmed ?? true,
        user_metadata: user_metadata ?? {},
      });

      if (error) throw new Error(`Auth create user error: ${error.message}`);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { created: true, user_id: data.user?.id, email: data.user?.email },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ─── Update User ──────────────────────────────────────────────────────────
  server.tool(
    "auth_update_user",
    "Update a user's email, password, or metadata in Supabase Auth.",
    {
      user_id: z.string().uuid().describe("UUID of the user to update"),
      email: z.string().email().optional().describe("New email address"),
      password: z.string().min(6).optional().describe("New password"),
      user_metadata: z
        .record(z.unknown())
        .optional()
        .describe("Metadata to merge into the user"),
      ban: z
        .boolean()
        .optional()
        .describe("Set true to ban the user, false to unban"),
    },
    async ({ user_id, email, password, user_metadata, ban }) => {
      const updates: Record<string, unknown> = {};
      if (email) updates.email = email;
      if (password) updates.password = password;
      if (user_metadata) updates.user_metadata = user_metadata;
      if (ban !== undefined) updates.ban_duration = ban ? "876600h" : "none";

      const { data, error } = await supabase.auth.admin.updateUserById(
        user_id,
        updates as Parameters<typeof supabase.auth.admin.updateUserById>[1]
      );

      if (error) throw new Error(`Auth update user error: ${error.message}`);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ updated: true, user: data.user }, null, 2),
          },
        ],
      };
    }
  );

  // ─── Delete User ──────────────────────────────────────────────────────────
  server.tool(
    "auth_delete_user",
    "Permanently delete a user from Supabase Auth.",
    {
      user_id: z.string().uuid().describe("UUID of the user to delete"),
    },
    async ({ user_id }) => {
      const { error } = await supabase.auth.admin.deleteUser(user_id);
      if (error) throw new Error(`Auth delete user error: ${error.message}`);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ deleted: true, user_id }, null, 2),
          },
        ],
      };
    }
  );

  // ─── Generate Magic Link ──────────────────────────────────────────────────
  server.tool(
    "auth_generate_magic_link",
    "Generate a one-time magic link for a user (passwordless sign-in).",
    {
      email: z.string().email().describe("Email address to send magic link to"),
    },
    async ({ email }) => {
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

      if (error) throw new Error(`Magic link error: ${error.message}`);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { link: data.properties?.action_link, email },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
