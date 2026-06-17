import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/chat" });
  },
  head: () => ({
    meta: [
      { title: "Núpublico — Mensagens" },
      {
        name: "description",
        content:
          "Núpublico — mensagens, estados, profissionais e serviços em Angola.",
      },
    ],
  }),
});
