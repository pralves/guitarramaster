-- Aumenta o limite de upload do bucket de videoaulas para 5 GB.
-- Ajuste o valor se precisar de outro limite.

update storage.buckets
set
  public = true,
  file_size_limit = 5368709120
where id = 'lesson-assets';

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
select
  'lesson-assets',
  'lesson-assets',
  true,
  5368709120
where not exists (
  select 1
  from storage.buckets
  where id = 'lesson-assets'
);
