# Plano: Nupublico MVP (estilo Yango Serviços)

Manter 100% do design, cores, tipografia, ícones e layout. Só simplificar a lógica interna e remover módulos pesados.

## 1. Remover / desativar

- **Chamadas de voz e vídeo**
  - Remover `IncomingCallProvider` do `__root.tsx`
  - Remover rota `src/routes/chamada.$id.tsx`
  - Remover botões de chamada do `chat.$id.tsx`
  - Deixar tabela `calls` no BD (não apagar dados), apenas desligar UI
- **Faturação avançada / proformas**
  - Remover rota `src/routes/faturas.tsx` e link em `configuracoes.tsx`
  - Remover `src/lib/billing-pdf.ts`, `invoice-pdf.ts`, `contract-pdf.ts`
  - Manter tabelas no BD intactas
- **Rede social / feed**
  - Simplificar `index.tsx`: substituir feed de posts + stories por **Home MVP**: barra de pesquisa, categorias, mapa de profissionais próximos, lista de profissionais recomendados
  - Remover rotas: `criar-post.tsx`, `publicar.tsx`, `inspiracao.tsx`
  - Remover `StoriesBar`, `FeedCard`, `PostEditor`
- **Contratos / smart posts / cupões / emergência avançada**
  - Remover `ContractCard`, `ContractDialog`, `emergencia.tsx` (fora do MVP)
  - Remover edge function `smart-post-generator` da navegação (não apagar)

## 2. Manter e polir

- Auth (login/registo) — sem alterações
- Perfil (`perfil.tsx`, `perfil.$id.tsx`) — manter foto, categoria, localização, preço
- **Mapa** (`mapa.tsx`) — otimizar: lazy-load, marcadores agrupados, avatares em `loading="lazy"`
- **Explorar** (`explorar.tsx`) — pesquisa por categoria (10 categorias fixas abaixo)
- **Agendamentos** (`agendamentos.tsx`) — pedidos: aceitar/rejeitar, histórico
- **Chat texto simples** (`chat.index.tsx`, `chat.$id.tsx`) — remover botões de chamada, manter texto + imagens
- Avaliações 1–5 estrelas (já existe em bookings)
- Configurações, planos, admin

## 3. Categorias MVP (fixas)

Canalizador · Eletricista · Pintor · Pedreiro · Jardineiro · Babá · Empregada doméstica · Motorista · Técnico de informática · Técnico de ar condicionado

Centralizar em `src/lib/categories.ts` e usar em Home, Explorar, Perfil, Publicar-serviço.

## 4. Bottom nav simplificada

`MobileShell` passa a ter 5 tabs: **Início · Explorar · Mapa · Pedidos · Perfil** (remover Chat da nav principal; chat acessível via perfil/pedido).

## 5. Performance

- `loading="lazy"` + `decoding="async"` em todos os avatares
- `React.lazy` para `mapa.tsx` (leaflet é pesado)
- Reduzir `select("*")` → colunas específicas nas queries principais
- Remover realtime channels dos módulos desativados

## 6. Ficheiros

**Apagar:** `chamada.$id.tsx`, `faturas.tsx`, `criar-post.tsx`, `publicar.tsx`, `inspiracao.tsx`, `emergencia.tsx`, `IncomingCallProvider.tsx`, `StoriesBar.tsx`, `FeedCard.tsx`, `PostEditor.tsx`, `ContractCard.tsx`, `ContractDialog.tsx`, `billing-pdf.ts`, `contract-pdf.ts`, `invoice-pdf.ts`

**Editar:** `__root.tsx`, `index.tsx` (nova Home MVP), `chat.$id.tsx` (sem chamadas), `configuracoes.tsx` (sem Faturação), `MobileShell.tsx` (nav 5 tabs), `explorar.tsx` (categorias fixas)

**Criar:** `src/lib/categories.ts`

## 7. Base de dados

**Sem migrações.** Manter todas as tabelas para não perder dados. Apenas parar de escrever/ler das que ficam sem UI.

## Resultado

App leve, focado em: cliente encontra profissional (mapa/categoria) → pede serviço → chat → conclusão → avaliação. Design, cores, tipografia e ícones **inalterados**.
