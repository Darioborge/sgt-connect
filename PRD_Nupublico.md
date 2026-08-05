# Product Requirements Document (PRD) — Núpublico

## 1. Visão Geral do Produto

**Núpublico** é uma plataforma digital angolana de criação automática de posts, geração de clientes e networking entre prestadores de serviços. O objetivo principal é transformar o utilizador num prestador digital profissional sem exigir conhecimentos de design ou marketing: o sistema constroi posts profissionais automaticamente e conecta prestadores a potenciais clientes através de feed social, mapa em tempo real, chat com contratos e faturação integrada.

### Proposta de Valor
- Criação de conteúdo profissional automatizada (templates, IA, exportação em HD).
- Geração de clientes através de feed, mapa geolocalizado e chamadas/vídeo.
- Gestão completa do negócio: agendamentos, contratos, faturação e pagamentos em Kwanzas (Kz).
- Monetização adaptada ao mercado angolano: planos Premium, boost de posts e pagamento manual via Multicaixa/IBAN.

---

## 2. Utilizadores e Personas

| Tipo | Descrição | Objetivos |
|------|-----------|-----------|
| **Prestador de serviços** | Profissional autónomo (consultor, técnico, artista, vendedor) | Divulgar serviços, receber pedidos, gerar faturas, ser encontrado no mapa. |
| **Cliente** | Pessoa que procura serviços | Descobrir prestadores, contactar, contratar, pagar. |
| **Administrador** | Equipa interna Núpublico | Gerir utilizadores, ver estatísticas, confirmar pagamentos, moderar conteúdo. |
| **Agente externo (MCP)** | Aplicação ou assistente IA autorizado | Aceder dados do utilizador em seu nome via protocolo MCP. |

---

## 3. Funcionalidades por Módulo

### 3.1 Autenticação e Perfil

#### 3.1.1 Registo e Login
- Login/registo por email e palavra-passe via Supabase Auth.
- Suporte a redirecionamento pós-login (`next` parameter).
- Sessão persistente com refresh automático de tokens.

#### 3.1.2 Perfil do Utilizador
Campos editáveis do perfil:
- Nome completo (`full_name`)
- Nome de utilizador (`username`)
- Biografia/descrição (`bio`)
- Categoria de serviço (`category`)
- Cidade (`city`)
- Telefone (`phone`)
- Preço base (`price_from_kz`)
- Disponibilidade (`available`)
- Avaliação (`rating`)
- Serviços concluídos (`jobs_done`)
- Foto de avatar e foto de capa
- Localização geográfica (lat/lon) para o mapa

#### 3.1.3 Selo de Verificado
- **Selo verde** ativado automaticamente quando o utilizador completa todas as informações obrigatórias do perfil.
- O selo aparece em frente ao nome do utilizador no feed, no mapa e no perfil público.

#### 3.1.4 Perfil Público
- Rota `/perfil/$id` para visualização pública de qualquer utilizador.
- Mostra nome, selo, categoria, cidade, preço, avaliação, bio, posts e botão de contacto.

---

### 3.2 Feed e Posts

#### 3.2.1 Feed Principal (`/`)
- Lista de posts de prestadores.
- Cada post mostra:
  - Imagem/criação visual
  - Legenda
  - Nome e avatar do autor (clicável → perfil)
  - Selo de verificado
  - Curtidas (likes)
  - Botão de Reply/comentários
  - Menu de 3 pontos no canto superior direito

#### 3.2.2 Interações nos Posts
- **Curtir** um post.
- **Responder/Comentar**.
- **Menu de 3 pontos** com as seguintes opções:
  - Baixar imagem
  - Partilhar
  - Ver perfil do autor
  - Republicar
  - Promover o post (boost)

#### 3.2.3 Criação de Posts
- Editor de propriedades com pré-visualização em tempo real.
- Aplicação automática de templates visuais.
- Exportação da imagem final em PNG (HD para Premium).
- Limite de 3 posts/dia para utilizadores Free.
- Marca de água obrigatória em posts Free.
- Posts Premium sem marca de água e em HD.

#### 3.2.4 Boost de Posts
- Opções de alcance:
  - **Básico**: 500 Kz, ~500 visualizações, 2 dias
  - **Médio**: 1.000 Kz, ~1.500 visualizações, 5 dias
  - **Alto**: 2.000 Kz, ~5.000 visualizações, 7 dias
- Pagamento manual via Multicaixa/IBAN com confirmação administrativa.

---

### 3.3 Mapa em Tempo Real — "Perto de ti"

#### 3.3.1 Visualização do Mapa (`/mapa`)
- Mapa interativo baseado em Leaflet + OpenStreetMap (gratuito).
- Pins de prestadores cadastrados na plataforma.
- Filtros por distância e categoria.

#### 3.3.2 Cores dos Pins
- **Azul**: utilizador cadastrado/ativo.
- **Vermelho**: utilizador desqualificado/suspenso.
- **Toque no pin**: abre diretamente o perfil público do utilizador.

#### 3.3.3 Geolocalização
- O utilizador pode ativar a sua localização no perfil.
- A localização é utilizada para calcular distância e mostrar prestadores próximos.

---

### 3.4 Chat Avançado

#### 3.4.1 Lista de Conversas (`/chat`)
- Lista de conversas ordenadas pela última mensagem.
- Barra de stories inspirada no Instagram com os contactos recentes.
- Pesquisa de conversas por nome.

#### 3.4.2 Conversa Individual (`/chat/$id`)
- Mensagens de texto.
- **Mensagens de áudio** (gravação e reprodução).
- **Anexos de ficheiros/imagem**.
- **Reações com emojis**.
- **Chamada de voz** via link `tel:`.
- **Chamadas de vídeo** WebRTC (`/chamada/$id`).
- Notificações push de novas mensagens.

#### 3.4.3 Contrato de Prestação de Serviço
- Criação de contrato dentro da conversa.
- Campos: descrição do serviço, valor, data de execução, partes envolvidas.
- Geração automática de PDF profissional.
- Estados do contrato: **Pendente**, **Assinado**, **Concluído**.
- Cartão de contrato na conversa com estado e botão de download do PDF.

---

### 3.5 Faturação (Billing)

#### 3.5.1 Clientes de Faturação
- Criar e gerir clientes (nome, NIF, telefone, email, morada).
- Lista pesquisável de clientes.

#### 3.5.2 Faturas
- Criar faturas profissionais em PDF (formato A4).
- Campos: número da fatura, data, cliente, itens/serviços, valores, IVA, total.
- Estados: **Pendente**, **Paga**, **Cancelada**.
- Download do PDF.

#### 3.5.3 Pagamentos
- Registar pagamentos recebidos associados a faturas.
- Controlo de valores em dívida.

#### 3.5.4 Dashboard Financeiro
- Total faturado, total pago, total em dívida.
- Gráficos de evolução mensal.
- Lista de faturas recentes.

---

### 3.6 Monetização

#### 3.6.1 Plano Gratuito (Free)
- 3 posts por dia.
- Marca de água nos posts.
- Sem selo azul.

#### 3.6.2 Plano Premium
- Preços:
  - **Mensal**: 3.500 Kz/mês
  - **Trimestral**: 9.000 Kz (poupa 1.500 Kz)
- Benefícios:
  - Posts ilimitados
  - Exportação em HD
  - Selo azul no perfil
  - Templates avançados
  - Modos Viral, Premium, Venda Rápida e Story
  - Sem marca de água

#### 3.6.3 Pagamentos
- Pagamento manual via:
  - Multicaixa (telefone: +244 923 000 000)
  - IBAN: AO06 0040 0000 1234 5678 9012 3 (BAI)
  - Titular: Núpublico, Lda.
- Confirmação administrativa manual após receção do comprovativo.
- Futuro: integração Stripe para cartões internacionais.

#### 3.6.4 Boost de Posts
- Ver secção 3.2.4.

---

### 3.7 Notificações

- Notificações de novas mensagens.
- Notificações de solicitação de serviço.
- Notificações de estado de pagamento/assinatura.
- Notificações de chamadas perdidas.

---

### 3.8 Configurações

A página `/configuracoes` inclui:
- Editar perfil
- Planos e pagamentos
- Faturação (atalho)
- Termos e privacidade
- Idioma/região
- **Botão de Sair (Logout)**

---

## 4. Integração de Agentes (MCP)

### 4.1 Servidor MCP
- Endpoint: `/mcp`
- Protocolo: Model Context Protocol (MCP)
- Autenticação: OAuth via Supabase Auth (cada agente entra com a conta do utilizador)
- Consentimento do utilizador em `/lovable/oauth/consent`

### 4.2 Ferramentas Disponíveis
| Ferramenta | Descrição |
|------------|-----------|
| `get_profile` | Ver perfil do utilizador autenticado |
| `update_profile` | Atualizar nome, bio, categoria, cidade, telefone, preço, disponibilidade |
| `list_posts` | Listar publicações do utilizador |
| `create_post` | Criar nova publicação com imagem e legenda |
| `list_bookings` | Listar agendamentos (como prestador ou cliente) |
| `list_invoices` | Listar faturas emitidas |
| `list_clients` | Listar clientes de faturação |

---

## 5. Painel de Administração (Oculto)

### 5.1 Acesso
- Tela de login com credenciais especiais:
  - Email: `Adimistrador@nuvenda`
  - Senha: `madagascat123@`
- Redirecionamento automático para `/admin`.

### 5.2 Funcionalidades do Dashboard
- **Visão Geral**: gráficos interativos (Recharts) com:
  - Total de utilizadores
  - Total de posts
  - Total de faturas
  - Total de pagamentos
  - Crescimento mensal
- **Gestão de Utilizadores**:
  - Lista completa com filtros
  - Ver detalhes do utilizador (perfil, contacto, localização, estado)
  - Desqualificar/suspender utilizador (pin vermelho no mapa)
- **Gestão de Posts**:
  - Ver todos os posts
  - Adicionar novos posts em nome da plataforma
  - Promover/remover posts
- **Mapa Administrativo**:
  - Pins azuis: utilizadores ativos
  - Pins vermelhos: utilizadores desqualificados
  - Toque no pin abre perfil do utilizador
- **Confirmação de Pagamentos**:
  - Ver pagamentos pendentes
  - Aprovar/rejeitar manualmente via RPC `confirm_payment`

---

## 6. Requisitos Técnicos

### 6.1 Stack Tecnológica
- **Framework**: TanStack Start v1 (React 19, SSR/SSG, Vite 7)
- **Estilos**: Tailwind CSS v4 com tema escuro premium
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Mapas**: Leaflet + OpenStreetMap
- **PDFs**: jsPDF / html2canvas para contratos e faturas
- **Chamadas**: WebRTC
- **Agentes**: MCP via `@lovable.dev/mcp-js`

### 6.2 Bases de Dados Principais
- `profiles` — perfis de utilizadores
- `posts` — publicações do feed
- `conversations`, `messages` — chat
- `bookings` — agendamentos
- `service_contracts` — contratos de serviço
- `billing_clients`, `billing_invoices`, `billing_payments` — faturação
- `subscriptions`, `payments`, `post_boosts` — monetização
- `user_roles` — papéis de utilizador (admin)

### 6.3 Segurança
- Row Level Security (RLS) em todas as tabelas.
- Funções security definer com permissões restritas.
- Buckets de storage com políticas de acesso por owner.
- Credenciais de admin nunca armazenadas no cliente (validação server-side).
- Tokens OAuth para acesso de agentes externos.

---

## 7. Regras de Negócio

| Regra | Descrição |
|-------|-----------|
| Limite Free | 3 posts/dia para utilizadores não Premium. |
| Marca de água | Obrigatória em posts Free; removida para Premium. |
| Selo verde | Ativa automaticamente quando perfil está 100% completo. |
| Selo azul | Atribuído apenas a utilizadores Premium. |
| Boost | Só disponível após confirmação manual do pagamento. |
| Contratos | Só podem ser criados dentro de conversas existentes. |
| Admin | Acesso apenas via credenciais especiais; nunca exposto na navegação normal. |
| MCP | Agente só acede dados após consentimento explícito do utilizador. |

---

## 8. Fluxos Principais

### 8.1 Fluxo de Criação de Post
1. Utilizador escolhe template/visual.
2. Sistema gera automaticamente o conteúdo com base no perfil.
3. Utilizador edita propriedades (texto, cores, preço, categoria).
4. Pré-visualização em tempo real.
5. Exportação para PNG.
6. Publicação no feed (sujeita ao limite do plano).

### 8.2 Fluxo de Contratação
1. Cliente vê post ou pin no mapa.
2. Clica no perfil do prestador.
3. Inicia conversa no chat.
4. Prestador envia proposta/contrato.
5. Cliente aceita e assina digitalmente.
6. Serviço é executado.
7. Prestador emite fatura.
8. Cliente paga via Multicaixa/IBAN.
9. Admin confirma pagamento.

### 8.3 Fluxo de Assinatura Premium
1. Utilizador vai a Configurações → Planos.
2. Escolhe plano Mensal ou Trimestral.
3. Efetua transferência para Multicaixa/IBAN.
4. Carrega comprovativo.
5. Admin confirma pagamento.
6. Conta é ativada como Premium.

---

## 9. Métricas de Sucesso (KPIs)

- Número de utilizadores registados e ativos.
- Taxa de conversão Free → Premium.
- Número de posts criados por dia.
- Número de conversas e contratos gerados.
- Valor total faturado através da plataforma.
- Número de boosts de posts vendidos.
- Taxa de retenção semanal/mensal.
- Satisfação dos utilizadores (NPS futuro).

---

## 10. Roadmap Futuro (Fora do Âmbito Atual)

- Integração Stripe para pagamentos internacionais.
- Sistema de avaliações e reviews públicas.
- Programa de afiliados.
- Marketplace de templates.
- Notificações push nativas (PWA/OneSignal).
- Analytics avançado para prestadores.

---

## 11. Notas Finais

- O design segue um **tema escuro premium** com acentos amarelos/dourados (#F9C51A), inspirado em apps modernos de redes sociais.
- A navegação móvel principal tem 5 tabs: Início, Mapa, Publicar, Mensagens, Perfil.
- Todas as funcionalidades são pensadas para o mercado angolano, com preços em Kwanzas (Kz) e métodos de pagamento locais.
- A plataforma prioriza a simplicidade: o utilizador não cria do zero — escolhe inspiração e o sistema constroi o resto.
