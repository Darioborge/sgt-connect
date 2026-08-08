import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_profile",
  title: "Ver o meu perfil",
  description: "Devolve o perfil do utilizador autenticado no BB Serviços Express (nome, categoria, cidade, preço, avaliação)."
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, username, bio, category, city, phone, price_from_kz, rating, jobs_done, available, verified")
      .eq("id", ctx.getUserId()!)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Perfil não encontrado" }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { profile: data } };
  },
});
