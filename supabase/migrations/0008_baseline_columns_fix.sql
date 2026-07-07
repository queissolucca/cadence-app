-- BUG: app/api/baseline/*, middleware.js e app/v2/onboarding já dependem de
-- profiles.baseline_question/baseline_answer/baseline_date desde a Etapa 1,
-- mas nenhuma migration (0001-0007) chegou a criar essas colunas —
-- descoberto ao construir a Etapa 10 (antes-e-depois), que reusa esses
-- campos como "Dia 1" fixo. Sem isto, todo signup novo por /v2 quebra no
-- onboarding (o select/update em profiles.baseline_question falha).
alter table public.profiles
  add column if not exists baseline_question text,
  add column if not exists baseline_answer text,
  add column if not exists baseline_date date;
