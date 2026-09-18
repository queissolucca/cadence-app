-- paid_emails deixa de ser "uma linha por e-mail" e passa a ser o HISTÓRICO
-- de compras.
--
-- Até aqui `email` era a chave primária e o webhook fazia upsert: cada
-- pagamento SOBRESCREVIA o anterior. Com dois planos no ar (7 e 90 dias) isso
-- apaga informação de verdade — quem comprou a semana e depois o trimestre
-- perdia o registro da primeira compra, e não havia como auditar o que a
-- pessoa pagou.
--
-- ATENÇÃO À ORDEM: esta migration e o deploy do código são a MESMA mudança.
-- Os quatro pontos que leem acesso usavam `.maybeSingle()`, que ERRA com mais
-- de uma linha. Rodar isto com o código antigo no ar não quebra nada sozinho
-- (ninguém tem duas linhas ainda), mas a primeira segunda-compra derrubaria o
-- acesso de todo mundo. Rode junto com o deploy.

-- 1) chave própria. `email` vira só um campo indexado.
alter table public.paid_emails
  add column if not exists id uuid not null default gen_random_uuid();

alter table public.paid_emails drop constraint if exists paid_emails_pkey;
alter table public.paid_emails add primary key (id);

-- 2) a consulta que os quatro leitores fazem: pelo e-mail, maior validade
--    primeiro. Sem índice isso vira varredura a cada requisição do middleware.
create index if not exists paid_emails_email_validade_idx
  on public.paid_emails (email, expires_at desc nulls first);

-- 3) Quem lê continua sendo só o dono (e o service_role, que ignora RLS).
--    A policy de 0010 casava por e-mail e continua valendo com várias linhas.
--    Recriada aqui porque a troca de chave primária é o momento de conferir
--    que ela não ficou pra trás.
drop policy if exists "user can check own paid status" on public.paid_emails;
create policy "user can check own paid status" on public.paid_emails
  for select using (
    email = (select email from auth.users where id = auth.uid())
  );

-- O QUE ESTA MIGRATION NÃO FAZ: mexer nas linhas existentes. Cada e-mail hoje
-- tem uma linha só, e ela continua sendo a de maior validade — a leitura nova
-- devolve exatamente o mesmo resultado que a antiga devolvia pra todos eles.
