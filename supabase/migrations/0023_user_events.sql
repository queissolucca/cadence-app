-- Registro de TODAS as interações dos usuários (analytics de produto). Primeiras
-- colunas: created_at (datetime) e user_id, como pedido. Guarda a aba/rota
-- acessada, a UTM (link de origem), o referrer e um `meta` livre (jsonb) pra
-- qualquer detalhe (clicou em ajustes, alterou algo, etc.).
--
-- RLS: usuário insere só as próprias linhas (o app loga com a sessão dele). O
-- dashboard do dono lê com a service_role key (ignora RLS), fora do app.

create table if not exists public.user_events (
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete cascade,
  event text not null,          -- 'pageview' | 'click' | 'change' | ...
  path text,                    -- rota/aba (ex: /v2/revisao)
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  meta jsonb,
  id uuid primary key default gen_random_uuid()
);

create index if not exists user_events_created_idx on public.user_events (created_at desc);
create index if not exists user_events_user_idx on public.user_events (user_id, created_at desc);

alter table public.user_events enable row level security;

create policy "own user_events insert" on public.user_events
  for insert with check (user_id = auth.uid());
