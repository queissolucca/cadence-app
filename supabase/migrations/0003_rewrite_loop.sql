-- Cadence — loop de reescrita forçada (§2.2)
-- Depois de uma correção não-perfeita, o usuário reescreve a frase e a
-- reescrita é validada numa call leve. Guardamos o resultado no próprio
-- attempt original em vez de criar uma tabela nova.

alter table public.exercise_attempts
  add column rewrite_text text,
  add column rewrite_correct boolean;
