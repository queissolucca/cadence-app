# cadence

Aplicativo de inglês para treino diário com correção inteligente, revisão espaçada e memória de aprendizado.

## Setup

1. Instale as dependências:
   `npm install`
2. Copie `.env.example` para `.env.local` e preencha:
   - `ANTHROPIC_API_KEY` — API da Anthropic (correção, geração de conteúdo, roleplay).
   - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` — do seu projeto Supabase (Settings > API).
3. Rode as migrations (SQL Editor do Supabase), na ordem, de `supabase/migrations/0001_init.sql` até a mais recente em `supabase/migrations/`. Cada arquivo é aditivo e roda uma única vez — não repita um que já rodou com sucesso.
4. Inicie o app:
   `npm run dev`
5. Acesse:
   `http://localhost:3000`

## Deploy no Vercel

1. Crie um projeto no Vercel e conecte este repositório.
2. Adicione as 3 variáveis de ambiente do passo 2 do Setup (Project Settings > Environment Variables).
3. Rode as migrations pendentes no Supabase de produção antes de considerar o deploy testado — o código assume que as tabelas/colunas já existem.
4. Push em `main` faz deploy automático (integração Vercel + GitHub).

## Uso no celular (rede local)

Na mesma rede Wi-Fi, rode `npm run dev` e acesse `http://<seu-ip-local>:3000` (veja seu IP com `ipconfig getifaddr en0` no macOS).
