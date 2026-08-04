import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_invoices",
  title: "Listar faturas",
  description: "Lista as faturas emitidas pelo utilizador autenticado no módulo de Faturação, opcionalmente filtradas por estado.",
  inputSchema: {
    status: z.string().optional().describe("Filtrar por estado da fatura, por exemplo pendente ou paga"),
    limit: z.number().int().optional().describe("Número máximo de faturas (padrão 20)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const take = Math.min(Math.max(limit ?? 20, 1), 50);
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("billing_invoices")
      .select("id, number, description, status, amount_kz, total_kz, paid_kz, issued_at, due_at, client_id")
      .eq("user_id", ctx.getUserId()!)
      .order("issued_at", { ascending: false })
      .limit(take);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { invoices: data ?? [] } };
  },
});
