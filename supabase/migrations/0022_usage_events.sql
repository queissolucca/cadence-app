-- Logging de uso pra estimar CUSTO por usuário. Registra cada chamada à API do
-- Claude (Anthropic) com tokens de entrada/saída. (O custo do ElevenLabs sai do
-- `sessions.duration_seconds` onde mode='speaking' — voz.)
--
-- RLS: usuário só INSERE as próprias linhas (o app loga com a sessão dele). Não
-- há select pra usuário comum — o dashboard do dono lê com a service_role key
-- (que ignora o RLS), rodando FORA do app.

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,                 -- 'anthropic'
  kind text not null,                     -- 'chat' | 'memory_extract' | 'example_gen'
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  seconds int not null default 0,         -- reservado (não usado p/ Anthropic)
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_idx on public.usage_events (user_id, created_at desc);
create index if not exists usage_events_created_idx on public.usage_events (created_at desc);

alter table public.usage_events enable row level security;

create policy "own usage_events insert" on public.usage_events
  for insert with check (user_id = auth.uid());
