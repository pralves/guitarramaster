-- Repara/cria um admin quando o e-mail ja existe em auth.users, mas o login falha.
-- Troque os valores abaixo antes de executar no SQL Editor do Supabase.

do $$
declare
  admin_email text := 'pralves@eletrostarsoft.com.br';
  admin_password text := 'troque-esta-senha';
  admin_name text := 'admin';
  admin_id uuid;
  identities_id_type text;
  identities_id_value text;
begin
  select id
    into admin_id
  from auth.users
  where lower(email) = lower(admin_email)
    and deleted_at is null
  order by created_at desc
  limit 1;

  if admin_id is null then
    admin_id := gen_random_uuid();

    insert into auth.users (
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      admin_id,
      'authenticated',
      'authenticated',
      lower(admin_email),
      crypt(admin_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    );
  else
    update auth.users
    set
      aud = 'authenticated',
      role = 'authenticated',
      email = lower(admin_email),
      encrypted_password = crypt(admin_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      banned_until = null,
      deleted_at = null,
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb),
      updated_at = now()
    where id = admin_id;
  end if;

  select data_type
    into identities_id_type
  from information_schema.columns
  where table_schema = 'auth'
    and table_name = 'identities'
    and column_name = 'id';

  identities_id_value := case
    when identities_id_type = 'uuid' then gen_random_uuid()::text
    else admin_id::text
  end;

  delete from auth.identities
  where provider = 'email'
    and (
      lower(provider_id) = lower(admin_email)
      or user_id = admin_id
    );

  execute format(
    'insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      %L::%s,
      %L::uuid,
      jsonb_build_object(''sub'', %L, ''email'', lower(%L)),
      ''email'',
      lower(%L),
      now(),
      now(),
      now()
    )',
    identities_id_value,
    case when identities_id_type = 'uuid' then 'uuid' else 'text' end,
    admin_id::text,
    admin_id::text,
    admin_email,
    admin_email
  );

  delete from public.user_profiles
  where lower(email) = lower(admin_email)
    and id <> admin_id;

  insert into public.user_profiles (
    id,
    email,
    full_name,
    user_type,
    active,
    created_at,
    updated_at
  )
  values (
    admin_id,
    lower(admin_email),
    admin_name,
    'admin',
    true,
    now(),
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    user_type = 'admin',
    active = true,
    updated_at = now();
end $$;

select
  u.id,
  u.email,
  u.email_confirmed_at is not null as email_confirmed,
  p.user_type,
  p.active,
  exists (
    select 1
    from auth.identities i
    where i.user_id = u.id
      and i.provider = 'email'
  ) as has_email_identity
from auth.users u
left join public.user_profiles p on p.id = u.id
where lower(u.email) = lower('pralves@eletrostarsoft.com.br')
order by u.created_at desc;
