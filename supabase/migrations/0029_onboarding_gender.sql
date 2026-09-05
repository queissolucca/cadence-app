-- Adiciona o gênero ao onboarding (pergunta nova: Masculino / Feminino /
-- Prefiro não dizer / Outro).
alter table public.onboarding add column if not exists gender text;
