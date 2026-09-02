-- Onboarding pré-pagamento: 5 perguntas respondidas logo após criar a conta,
-- antes de pagar. Uma linha por usuário. `reasons`/`challenges` são arrays
-- (múltipla escolha). `profiles.onboarded_at` marca quem já respondeu (o
-- middleware usa pra decidir o fluxo).

create table if not exists public.onboarding (
  user_id uuid primary key references auth.users (id) on delete cascade,
  age text,
  level text,
  reasons jsonb,        -- ["Avançar na minha carreira.", ...]
  challenges jsonb,     -- ["Às vezes não encontro as palavras.", ...]
  daily_goal text,      -- "10 minutos / dia"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.onboarding enable row level security;

drop policy if exists "own onboarding select" on public.onboarding;
create policy "own onboarding select" on public.onboarding for select using (user_id = auth.uid());
drop policy if exists "own onboarding insert" on public.onboarding;
create policy "own onboarding insert" on public.onboarding for insert with check (user_id = auth.uid());
drop policy if exists "own onboarding update" on public.onboarding;
create policy "own onboarding update" on public.onboarding for update using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.profiles add column if not exists onboarded_at timestamptz;
