-- Verifica por que o login admin ainda falha.
-- Troque admin_password pela MESMA senha que voce tentou usar no login.

with params as (
  select
    'pralves@eletrostarsoft.com.br'::text as admin_email,
    'troque-esta-senha'::text as admin_password
)

select
  u.id,
  u.email,
  u.aud,
  u.role,
  u.encrypted_password is not null as has_password,
  (u.encrypted_password = crypt(params.admin_password, u.encrypted_password)) as password_matches,
  u.email_confirmed_at is not null as email_confirmed,
  u.confirmed_at is not null as confirmed,
  u.banned_until,
  u.deleted_at,
  u.raw_app_meta_data,
  u.created_at,
  u.updated_at
from auth.users u
cross join params
where lower(u.email) = lower(params.admin_email)
order by u.created_at desc;

with params as (
  select 'pralves@eletrostarsoft.com.br'::text as admin_email
)
select
  p.id,
  p.email,
  p.full_name,
  p.user_type,
  p.active
from public.user_profiles p
cross join params
where lower(p.email) = lower(params.admin_email);

with params as (
  select 'pralves@eletrostarsoft.com.br'::text as admin_email
)
select
  i.user_id,
  i.provider,
  i.provider_id,
  i.identity_data
from auth.identities i
where i.user_id in (
  select id
  from auth.users
  cross join params
  where lower(email) = lower(params.admin_email)
);
