create table if not exists public.minicurso_inscricoes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null,
  state text not null,
  instrument text not null,
  source text not null default 'cadastro-interessado',
  created_at timestamptz not null default now()
);

alter table public.minicurso_inscricoes enable row level security;

create policy "service_role_can_manage_minicurso_inscricoes"
on public.minicurso_inscricoes
for all
to service_role
using (true)
with check (true);
