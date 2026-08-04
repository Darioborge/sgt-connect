import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_bookings",
  title: "Listar agendamentos",
  description: "Lista os agendamentos do utilizador autenticado (como prestador ou como cliente), opcionalmente filtrados por estado.",
  inputSchema: {
    status: z.string().optional().describe("Filtrar por estado do agendamento, por exemplo pendente ou concluido"),
    limit: z.number().int().optional().describe("Número máximo de resultados (padrão 20)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const uid = ctx.getUserId()!;
    const take = Math.min(Math.max(limit ?? 20, 1), 50);
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("bookings")
      .select("id, provider_id, client_id, category, description, address, price_kz, scheduled_at, status")
      .or(`provider_id.eq.${uid},client_id.eq.${uid}`)
      .order("scheduled_at", { ascending: false })
      .limit(take);
    if (status) query = query.eq("status", status as never);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { bookings: data ?? [] } };
  },
});
