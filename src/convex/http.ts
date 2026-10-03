import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB cap for images

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const http = httpRouter();

// OPTIONS preflight for the upload endpoint.
http.route({
  path: "/uploadImage",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: cors })),
});

/**
 * Image upload via built-in file storage.
 * POST multipart/form-data with a `file` field → { url, storageId }.
 */
http.route({
  path: "/uploadImage",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return new Response(JSON.stringify({ error: "no file" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...cors },
        });
      }
      if (file.size > MAX_BYTES) {
        return new Response(JSON.stringify({ error: "file too large" }), {
          status: 413,
          headers: { "Content-Type": "application/json", ...cors },
        });
      }
      const blob = new Blob([await file.arrayBuffer()], { type: file.type || "image/png" });
      const storageId = await ctx.storage.store(blob);
      const url = (await ctx.storage.getUrl(storageId)) ?? "";
      return new Response(JSON.stringify({ url, storageId }), {
        status: 201,
        headers: { "Content-Type": "application/json", ...cors },
      });
    } catch (err) {
      console.error("[uploadImage] failed:", err);
      return new Response(JSON.stringify({ error: "upload failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }
  }),
});

export default http;
