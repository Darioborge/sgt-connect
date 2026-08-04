import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_profile",
  title: "Atualizar perfil",
  description: "Atualiza campos do perfil do utilizador autenticado (nome, bio, categoria, cidade, telefone, preço, disponibilidade).",
  inputSchema: {
    full_name: z.string().optional().describe("Nome completo"),
    bio: z.string().optional().describe("Descrição do perfil"),
    category: z.string().optional().describe("Categoria de serviço"),
    city: z.string().optional().describe("Cidade"),
    phone: z.string().optional().describe("Telefone de contacto"),
    price_from_kz: z.number().optional().describe("Preço a partir de, em Kwanzas"),
    available: z.boolean().optional().describe("Disponibilidade ativa"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const patch = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
    if (Object.keys(patch).length === 0)
      return { content: [{ type: "text", text: "Nenhum campo para atualizar" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", ctx.getUserId()!)
      .select("id, full_name, bio, category, city, phone, price_from_kz, available")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { profile: data } };
  },
});
