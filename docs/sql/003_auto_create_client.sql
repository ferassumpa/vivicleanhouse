-- Ao criar profile com role=client, cria linha em clients vinculada ao user_id
create or replace function public.handle_new_client_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'client' then
    insert into public.clients (user_id, full_name, email)
    values (
      new.id,
      coalesce(new.full_name, 'Cliente'),
      (select email from auth.users where id = new.id)
    )
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_create_client on public.profiles;
create trigger on_profile_create_client
  after insert on public.profiles
  for each row execute function public.handle_new_client_profile();

-- Permite o próprio usuário criar/atualizar seu registro de cliente (cadastro)
drop policy if exists clients_insert_own on public.clients;
create policy clients_insert_own on public.clients
  for insert with check (user_id = auth.uid());

drop policy if exists clients_update_own on public.clients;
create policy clients_update_own on public.clients
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
