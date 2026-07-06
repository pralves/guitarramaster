-- Necessario para a gestao completa de aulas no painel admin.

alter table public.lessons
  add column if not exists content text;
