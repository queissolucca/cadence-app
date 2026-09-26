-- "Para Creators": a faixa de seguidores no Instagram ("Quantos seguidores
-- você tem?"), escolha única e obrigatória no formulário. Os textos do check
-- são os mesmos de SEGUIDORES em lib/creators.js.
--
-- Nullable de propósito: quem enviou antes desta coluna existir não tem a
-- resposta, e inventar uma faixa pra eles seria dado falso. Obrigatório é o
-- formulário, conferido de novo em /api/creators.
--
-- Pode rodar antes ou depois do deploy: sem esta coluna, o insert em creators
-- falha e o envio cai na tabela feedback como texto, com a faixa dentro.
alter table public.creators
  add column if not exists seguidores text;

alter table public.creators
  drop constraint if exists creators_seguidores_check;

alter table public.creators
  add constraint creators_seguidores_check
  check (seguidores is null or seguidores in (
    'Menos de 1.000', '1.000 a 10 mil', '10 mil a 50 mil', '50 mil a 100 mil', '100 mil ou mais'
  ));
