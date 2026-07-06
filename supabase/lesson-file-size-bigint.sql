-- Permite registrar arquivos maiores que 2 GB.

alter table public.lesson_videos
  alter column file_size type bigint using file_size::bigint;

alter table public.lesson_materials
  alter column file_size type bigint using file_size::bigint;
