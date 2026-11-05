-- SPEC 11: perfiles de usuario, scores.user_id y RLS de inserción; cierra rls_auto_enable().

create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  username           text not null unique check (username ~ '^[A-Z0-9_]{3,10}$'),
  username_confirmed boolean not null default false,
  created_at         timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Lectura pública (solo username; el email no está en profiles).
create policy profiles_select_public on public.profiles
  for select to anon, authenticated using (true);

-- El dueño solo puede editar su perfil mientras no haya confirmado el username.
create policy profiles_update_own_unconfirmed on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and not username_confirmed)
  with check (id = (select auth.uid()));

-- Alta automática del perfil al crearse un usuario en auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested text := upper(nullif(btrim(meta ->> 'username'), ''));
  base text;
  candidate text;
  attempts int := 0;
begin
  -- Registro con email: el username viene del formulario. Si es inválido o
  -- ya existe, el insert falla (check / unique) y el alta se cancela.
  if requested is not null then
    insert into public.profiles (id, username, username_confirmed)
    values (new.id, requested, true);
    return new;
  end if;

  -- OAuth: username provisional a partir de los metadatos del proveedor.
  base := upper(regexp_replace(
    coalesce(
      nullif(meta ->> 'user_name', ''),
      nullif(meta ->> 'preferred_username', ''),
      nullif(meta ->> 'full_name', ''),
      nullif(meta ->> 'name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    '[^A-Za-z0-9_]', '', 'g'
  ));
  base := left(base, 7);
  if length(base) < 3 then
    base := left('USR' || base, 7);
  end if;

  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    attempts := attempts + 1;
    if attempts > 20 then
      raise exception 'No se pudo generar un username único';
    end if;
    candidate := base || lpad((floor(random() * 1000))::int::text, 3, '0');
  end loop;

  insert into public.profiles (id, username, username_confirmed)
  values (new.id, candidate, false);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Puntuaciones: autor opcional (nulo para invitados y filas antiguas).
alter table public.scores
  add column user_id uuid references public.profiles (id) on delete set null;

create index scores_user_id_idx on public.scores (user_id);

drop policy scores_insert_public on public.scores;

-- Invitado (user_id nulo) o autor autenticado firmando con su propio username.
create policy scores_insert on public.scores
  for insert to anon, authenticated
  with check (
    user_id is null
    or (
      user_id = (select auth.uid())
      and name = (select username from public.profiles where id = user_id)
    )
  );

-- rls_auto_enable() es una función de event trigger: no debe ser invocable vía /rest/v1/rpc.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
