-- Histórico de conversas do agente de voz. Guarda a conversa inteira (todas as
-- falas, do usuário e do coach) como jsonb, uma linha por conversa. É o que
-- alimenta a barra lateral de histórico (estilo LLM) na aba Conversar, pra o
-- usuário poder voltar num tema específico depois.
--
-- Só escrita de texto — não muda o custo de token (o ElevenLabs cobra por
-- minuto de fala, e o transcript já existe; salvar é barato).
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  title text,
  theme text,
  turn_count int not null default 0,
  duration_seconds int not null default 0,
  -- [{ role: 'you' | 'coach', text: string, at: iso-timestamp }]
  messages jsonb not null default '[]'::jsonb
);

-- Listagem da barra lateral: as conversas do usuário, mais recentes primeiro.
create index conversations_user_started_idx
  on public.conversations (user_id, started_at desc);

alter table public.conversations enable row level security;

create policy "own conversations select" on public.conversations
  for select using (user_id = auth.uid());

create policy "own conversations insert" on public.conversations
  for insert with check (user_id = auth.uid());

create policy "own conversations delete" on public.conversations
  for delete using (user_id = auth.uid());
