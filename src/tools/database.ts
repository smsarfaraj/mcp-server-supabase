import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabase } from "../supabase.js";

export function registerDatabaseTools(server: McpServer) {
  // ─── List Tables ──────────────────────────────────────────────────────────
  server.tool(
    "db_list_tables",
    "List all user-created tables in the public schema of your Supabase database.",
    {},
    async () => {
      const supabaseUrl = process.env.SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

      // Fetch the PostgREST OpenAPI spec — it lists every exposed table/view
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`);
      }

      const spec = await response.json() as {
        definitions?: Record<string, { description?: string; properties?: Record<string, { type?: string; format?: string }> }>;
      };

      const tables = Object.entries(spec.definitions ?? {}).map(([name, def]) => ({
        table: name,
        columns: Object.entries(def.properties ?? {}).map(([col, meta]) => ({
          column: col,
          type: meta.format ?? meta.type ?? "unknown",
        })),
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ tables, count: tables.length }, null, 2),
          },
        ],
      };
    }
  );

  // ─── Query (SELECT) ───────────────────────────────────────────────────────
  server.tool(
    "db_query",
    "Query rows from a Supabase table. Supports filters, column selection, ordering, and pagination.",
    {
      table: z.string().describe("Table name to query"),
      columns: z
        .string()
        .optional()
        .default("*")
        .describe('Columns to select, e.g. "id,name,email" or "*"'),
      filters: z
        .array(
          z.object({
            column: z.string(),
            operator: z.enum([
              "eq", "neq", "gt", "gte", "lt", "lte",
              "like", "ilike", "is", "in", "contains",
            ]),
            value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
          })
        )
        .optional()
        .default([])
        .describe("Filter conditions applied to the query"),
      order_by: z.string().optional().describe("Column to order by"),
      ascending: z.boolean().optional().default(true).describe("Sort direction"),
      limit: z.number().optional().default(100).describe("Max rows to return (default 100)"),
      offset: z.number().optional().default(0).describe("Row offset for pagination"),
    },
    async ({ table, columns, filters, order_by, ascending, limit, offset }) => {
      let query = supabase.from(table).select(columns ?? "*");

      for (const f of filters ?? []) {
        switch (f.operator) {
          case "eq":   query = query.eq(f.column, f.value);   break;
          case "neq":  query = query.neq(f.column, f.value);  break;
          case "gt":   query = query.gt(f.column, f.value);   break;
          case "gte":  query = query.gte(f.column, f.value);  break;
          case "lt":   query = query.lt(f.column, f.value);   break;
          case "lte":  query = query.lte(f.column, f.value);  break;
          case "like": query = query.like(f.column, String(f.value)); break;
          case "ilike":query = query.ilike(f.column, String(f.value));break;
          case "is":   query = query.is(f.column, f.value as null | boolean); break;
          case "in":   query = query.in(f.column, Array.isArray(f.value) ? f.value : [f.value]); break;
          case "contains": query = query.contains(f.column, f.value as unknown as string | readonly unknown[] | Record<string, unknown>); break;
        }
      }

      if (order_by) query = query.order(order_by, { ascending: ascending ?? true });
      query = query.range(offset ?? 0, (offset ?? 0) + (limit ?? 100) - 1);

      const { data, error, count } = await query;
      if (error) throw new Error(`DB query error: ${error.message}`);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ rows: data, count: count ?? data?.length ?? 0 }, null, 2),
          },
        ],
      };
    }
  );

  // ─── Insert ───────────────────────────────────────────────────────────────
  server.tool(
    "db_insert",
    "Insert one or more rows into a Supabase table.",
    {
      table: z.string().describe("Target table name"),
      rows: z
        .array(z.record(z.unknown()))
        .describe("Array of row objects to insert"),
      upsert: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, upsert (insert or update on conflict)"),
    },
    async ({ table, rows, upsert }) => {
      const op = upsert
        ? supabase.from(table).upsert(rows).select()
        : supabase.from(table).insert(rows).select();

      const { data, error } = await op;
      if (error) throw new Error(`DB insert error: ${error.message}`);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ inserted: data, count: data?.length ?? 0 }, null, 2),
          },
        ],
      };
    }
  );

  // ─── Update ───────────────────────────────────────────────────────────────
  server.tool(
    "db_update",
    "Update rows in a Supabase table that match a filter.",
    {
      table: z.string().describe("Target table name"),
      filter_column: z.string().describe("Column to filter on (e.g. 'id')"),
      filter_value: z.union([z.string(), z.number()]).describe("Value to match"),
      updates: z.record(z.unknown()).describe("Key-value pairs to update"),
    },
    async ({ table, filter_column, filter_value, updates }) => {
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq(filter_column, filter_value)
        .select();

      if (error) throw new Error(`DB update error: ${error.message}`);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ updated: data, count: data?.length ?? 0 }, null, 2),
          },
        ],
      };
    }
  );

  // ─── Delete ───────────────────────────────────────────────────────────────
  server.tool(
    "db_delete",
    "Delete rows from a Supabase table that match a filter. Returns the deleted rows.",
    {
      table: z.string().describe("Target table name"),
      filter_column: z.string().describe("Column to filter on (e.g. 'id')"),
      filter_value: z.union([z.string(), z.number()]).describe("Value to match"),
    },
    async ({ table, filter_column, filter_value }) => {
      const { data, error } = await supabase
        .from(table)
        .delete()
        .eq(filter_column, filter_value)
        .select();

      if (error) throw new Error(`DB delete error: ${error.message}`);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ deleted: data, count: data?.length ?? 0 }, null, 2),
          },
        ],
      };
    }
  );

  // ─── Raw SQL (via RPC) ────────────────────────────────────────────────────
  server.tool(
    "db_rpc",
    "Call a Supabase database function (RPC). The function must be defined in your Supabase project.",
    {
      function_name: z.string().describe("Name of the Postgres function to call"),
      params: z
        .record(z.unknown())
        .optional()
        .default({})
        .describe("Parameters to pass to the function"),
    },
    async ({ function_name, params }) => {
      const { data, error } = await supabase.rpc(function_name, params ?? {});
      if (error) throw new Error(`RPC error: ${error.message}`);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ result: data }, null, 2),
          },
        ],
      };
    }
  );
}
