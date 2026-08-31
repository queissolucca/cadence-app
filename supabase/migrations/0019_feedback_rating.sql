-- Feedback agora aceita uma AVALIAÇÃO (1–5 estrelas) e guarda o e-mail de quem
-- enviou. O texto vira opcional (dá pra mandar só as estrelas). Organizado por
-- created_at (datetime) — já indexável por data.

alter table public.feedback
  add column if not exists rating int,
  add column if not exists email text;

-- texto deixa de ser obrigatório (pode mandar só a nota)
alter table public.feedback alter column message drop not null;

create index if not exists feedback_created_idx on public.feedback (created_at desc);
