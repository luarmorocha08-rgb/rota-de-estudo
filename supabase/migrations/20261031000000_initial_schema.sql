-- Já aplicado no projeto Supabase "rota-de-estudo" (qnzvembvucbbfvzmjzhk).
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  stripe_customer_id text unique,
  subscription_status text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke update on public.profiles from authenticated, anon;
grant update (name) on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name) values (new.id, new.raw_user_meta_data->>'name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
create policy "state_select_own" on public.user_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "state_insert_own" on public.user_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "state_update_own" on public.user_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table public.lessons (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  req jsonb not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.lessons enable row level security;
create policy "lessons_select_own" on public.lessons for select to authenticated using ((select auth.uid()) = user_id);
create policy "lessons_insert_own" on public.lessons for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "lessons_update_own" on public.lessons for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
create policy "usage_select_own" on public.ai_usage for select to authenticated using ((select auth.uid()) = user_id);

-- Conta um uso de IA da própria pessoa; devolve false se passou do limite do dia.
-- Pode ser chamada por usuários logados de propósito: só aumenta o próprio contador.
create or replace function public.consume_ai_credit(p_limit int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null then return false; end if;
  insert into public.ai_usage (user_id, day, count) values (uid, current_date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count into n;
  return n <= p_limit;
end $$;
revoke execute on function public.consume_ai_credit(int) from public, anon;
grant execute on function public.consume_ai_credit(int) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Registro de erros do servidor (para diagnóstico). Usuários só podem inserir; ninguém lê pela API.
create table public.app_errors (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  route text not null,
  message text not null,
  created_at timestamptz not null default now()
);
alter table public.app_errors enable row level security;
create policy "errors_insert_own" on public.app_errors for insert to authenticated with check (user_id = (select auth.uid()));
