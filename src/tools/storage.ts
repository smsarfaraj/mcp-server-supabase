import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabase } from "../supabase.js";

export function registerStorageTools(server: McpServer) {
  // ─── List Buckets ─────────────────────────────────────────────────────────
  server.tool(
    "storage_list_buckets",
    "List all storage buckets in your Supabase project.",
    {},
    async () => {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw new Error(`Storage list buckets error: ${error.message}`);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );

  // ─── List Files in Bucket ─────────────────────────────────────────────────
  server.tool(
    "storage_list_files",
    "List files inside a Supabase Storage bucket, optionally inside a folder path.",
    {
      bucket: z.string().describe("Bucket name"),
      folder: z
        .string()
        .optional()
        .default("")
        .describe('Folder path inside the bucket, e.g. "images/avatars"'),
      limit: z.number().optional().default(100).describe("Max files to return"),
      offset: z.number().optional().default(0).describe("Offset for pagination"),
    },
    async ({ bucket, folder, limit, offset }) => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(folder ?? "", {
          limit: limit ?? 100,
          offset: offset ?? 0,
          sortBy: { column: "name", order: "asc" },
        });

      if (error) throw new Error(`Storage list files error: ${error.message}`);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ files: data, count: data?.length ?? 0 }, null, 2),
          },
        ],
      };
    }
  );

  // ─── Get Public URL ───────────────────────────────────────────────────────
  server.tool(
    "storage_get_public_url",
    "Get the public URL for a file in a Supabase Storage bucket.",
    {
      bucket: z.string().describe("Bucket name"),
      path: z.string().describe('File path inside the bucket, e.g. "avatars/user123.jpg"'),
    },
    async ({ bucket, path }) => {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ public_url: data.publicUrl }, null, 2),
          },
        ],
      };
    }
  );

  // ─── Create Signed URL ────────────────────────────────────────────────────
  server.tool(
    "storage_create_signed_url",
    "Create a time-limited signed URL for private file access.",
    {
      bucket: z.string().describe("Bucket name"),
      path: z.string().describe("File path inside the bucket"),
      expires_in: z
        .number()
        .optional()
        .default(3600)
        .describe("Expiry time in seconds (default: 1 hour)"),
    },
    async ({ bucket, path, expires_in }) => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expires_in ?? 3600);

      if (error) throw new Error(`Signed URL error: ${error.message}`);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ signed_url: data?.signedUrl, expires_in }, null, 2),
          },
        ],
      };
    }
  );

  // ─── Upload File from URL ─────────────────────────────────────────────────
  server.tool(
    "storage_upload_from_url",
    "Download a file from a remote URL and upload it to Supabase Storage.",
    {
      bucket: z.string().describe("Bucket name"),
      destination_path: z
        .string()
        .describe('Destination path inside bucket, e.g. "images/photo.jpg"'),
      source_url: z.string().url().describe("Public URL of the file to upload"),
      content_type: z
        .string()
        .optional()
        .describe('MIME type, e.g. "image/jpeg" (auto-detected if omitted)'),
    },
    async ({ bucket, destination_path, source_url, content_type }) => {
      // Fetch the remote file
      const response = await fetch(source_url);
      if (!response.ok) {
        throw new Error(`Failed to fetch source URL: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const mimeType =
        content_type ?? response.headers.get("content-type") ?? "application/octet-stream";

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(destination_path, arrayBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) throw new Error(`Storage upload error: ${error.message}`);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ uploaded: true, path: data?.path }, null, 2),
          },
        ],
      };
    }
  );

  // ─── Move / Rename File ───────────────────────────────────────────────────
  server.tool(
    "storage_move_file",
    "Move or rename a file within the same Supabase Storage bucket.",
    {
      bucket: z.string().describe("Bucket name"),
      from_path: z.string().describe("Current file path"),
      to_path: z.string().describe("New file path"),
    },
    async ({ bucket, from_path, to_path }) => {
      const { error } = await supabase.storage
        .from(bucket)
        .move(from_path, to_path);

      if (error) throw new Error(`Storage move error: ${error.message}`);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ moved: true, from: from_path, to: to_path }, null, 2),
          },
        ],
      };
    }
  );

  // ─── Delete File(s) ───────────────────────────────────────────────────────
  server.tool(
    "storage_delete_files",
    "Delete one or more files from a Supabase Storage bucket.",
    {
      bucket: z.string().describe("Bucket name"),
      paths: z
        .array(z.string())
        .describe("Array of file paths to delete, e.g. [\"avatars/old.jpg\"]"),
    },
    async ({ bucket, paths }) => {
      const { data, error } = await supabase.storage.from(bucket).remove(paths);
      if (error) throw new Error(`Storage delete error: ${error.message}`);

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
}
