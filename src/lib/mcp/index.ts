import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get-profile";
import updateProfile from "./tools/update-profile";
import listPosts from "./tools/list-posts";
import createPost from "./tools/create-post";
import listBookings from "./tools/list-bookings";
import listInvoices from "./tools/list-invoices";
import listClients from "./tools/list-clients";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "nupublico",
  title: "Nupublico",
  version: "0.1.0",
  instructions:
    "Ferramentas do Núpublico, a plataforma angolana de prestadores de serviços. Permite consultar e atualizar o perfil, listar e criar publicações, consultar agendamentos, faturas e clientes de faturação do utilizador autenticado. Valores monetários estão em Kwanzas (Kz).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfile, updateProfile, listPosts, createPost, listBookings, listInvoices, listClients],
});
