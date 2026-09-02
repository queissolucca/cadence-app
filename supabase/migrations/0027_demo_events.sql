-- Rate-limit do demo pré-cadastro (voz/texto), pra ninguém abusar do endpoint
-- público e queimar minutos do ElevenLabs / tokens do Claude. 1 linha por
-- tentativa; os endpoints contam por IP na última hora. RLS ligado SEM policies:
-- só o service_role (admin client) acessa — anônimo não lê nem escreve.

create table if not exists public.demo_events (
  id uuid primary key default gen_random_uuid(),
  ip text,
  kind text not null,   -- 'voice' | 'text'
  created_at timestamptz not null default now()
);

create index if not exists demo_events_ip_idx on public.demo_events (ip, kind, created_at desc);

alter table public.demo_events enable row level security;
