-- Número de cliente sequencial (1, 2, 3…) por usuário, SEM tocar no user_id
-- real (UUID do Supabase Auth — mexer nele quebraria login/RLS/foreign keys).
-- É um mapa à parte: UUID -> client_id. Usado nos dashboards/analytics.
-- O mais antigo (você) fica com #1.

create sequence if not exists public.client_id_seq;

create table if not exists public.client_ids (
  user_id uuid primary key references auth.users (id) on delete cascade,
  client_id bigint not null unique default nextval('public.client_id_seq'),
  created_at timestamptz not null default now()
);

-- Backfill dos usuários existentes em ordem de cadastro (mais antigo = #1).
insert into public.client_ids (user_id)
select id from auth.users
where id not in (select user_id from public.client_ids)
order by created_at asc
on conflict (user_id) do nothing;

-- Novos usuários recebem o próximo client_id automaticamente no signup.
create or replace function public.assign_client_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.client_ids (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_client_id on auth.users;
create trigger on_auth_user_created_client_id
  after insert on auth.users
  for each row execute function public.assign_client_id();

alter table public.client_ids enable row level security;
drop policy if exists "read own client_id" on public.client_ids;
create policy "read own client_id" on public.client_ids
  for select using (user_id = auth.uid());
