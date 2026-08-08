import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_post",
  title: "Criar publicação",
  description: "Cria uma nova publicação no feed do BB Serviços Express com uma imagem (URL) e uma legenda.",
  inputSchema: {
    image_url: z.string().describe("URL da imagem da publicação"),
    caption: z.string().optional().describe("Legenda da publicação"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ image_url, caption }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("posts")
      .insert({ user_id: ctx.getUserId()!, image_url, caption: caption ?? null })
      .select("id, caption, image_url, created_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { post: data } };
  },
});
