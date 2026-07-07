-- profiles.weekly_cadence_target tinha check in (3,5,7) — a Etapa 7 pede um
-- stepper contínuo de 3 a 7 dias/semana em Ajustes, o que a constraint
-- antiga rejeitaria pra 4 ou 6.
alter table public.profiles
  drop constraint if exists profiles_cadence_check;

alter table public.profiles
  add constraint profiles_cadence_check check (weekly_cadence_target between 3 and 7);
