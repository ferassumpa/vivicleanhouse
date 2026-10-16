-- ViviClenaer — schema inicial (rodar no SQL Editor do Supabase)

create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'employee', 'client');
create type public.pricing_type as enum ('hourly', 'package', 'per_property');
create type public.cleaning_status as enum (
  'requested',
  'confirmed',
  'in_progress',
  'done',
  'cancelled'
);
create type public.photo_kind as enum ('before', 'after');

-- Perfis (1:1 com auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'client',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

-- Funcionária ganha por faxina (pay_per_cleaning)
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null,
  phone text,
  pay_per_cleaning numeric(10, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  label text not null,
  property_type text not null default 'apartamento',
  address text,
  access_notes text,
  default_pricing_type public.pricing_type not null default 'per_property',
  price_hourly numeric(10, 2),
  price_package numeric(10, 2),
  price_fixed numeric(10, 2),
  estimated_duration_minutes int not null default 120,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.service_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10, 2) not null,
  duration_minutes int not null default 120,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Disponibilidade criada por admin (e opcionalmente funcionária)
create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  employee_id uuid references public.employees (id) on delete set null,
  is_open boolean not null default true,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint availability_slots_time_check check (end_time > start_time)
);

create table public.cleanings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete restrict,
  client_id uuid not null references public.clients (id) on delete restrict,
  employee_id uuid references public.employees (id) on delete set null,
  availability_slot_id uuid references public.availability_slots (id) on delete set null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz,
  status public.cleaning_status not null default 'requested',
  pricing_type public.pricing_type not null default 'per_property',
  unit_price numeric(10, 2) not null default 0,
  hours numeric(6, 2),
  revenue_amount numeric(10, 2) not null default 0,
  employee_pay_amount numeric(10, 2) not null default 0,
  materials_cost numeric(10, 2) not null default 0,
  other_costs numeric(10, 2) not null default 0,
  notes text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cleaning_photos (
  id uuid primary key default gen_random_uuid(),
  cleaning_id uuid not null references public.cleanings (id) on delete cascade,
  kind public.photo_kind not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit_cost numeric(10, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cleaning_materials (
  id uuid primary key default gen_random_uuid(),
  cleaning_id uuid not null references public.cleanings (id) on delete cascade,
  material_id uuid references public.materials (id) on delete set null,
  name text not null,
  quantity numeric(10, 2) not null default 1,
  unit_cost numeric(10, 2) not null default 0,
  total_cost numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index cleanings_scheduled_start_idx on public.cleanings (scheduled_start);
create index cleanings_status_idx on public.cleanings (status);
create index cleanings_employee_id_idx on public.cleanings (employee_id);
create index cleanings_property_id_idx on public.cleanings (property_id);
create index availability_slots_date_idx on public.availability_slots (slot_date);

-- Helpers de role
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.my_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.employees where user_id = auth.uid() limit 1;
$$;

create or replace function public.my_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.clients where user_id = auth.uid() limit 1;
$$;

-- Trigger: cria profile ao registrar usuário
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'client')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Recalcula materials_cost na faxina
create or replace function public.refresh_cleaning_materials_cost()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  target_id := coalesce(new.cleaning_id, old.cleaning_id);
  update public.cleanings c
  set materials_cost = coalesce((
    select sum(cm.total_cost) from public.cleaning_materials cm where cm.cleaning_id = target_id
  ), 0),
  updated_at = now()
  where c.id = target_id;
  return coalesce(new, old);
end;
$$;

create trigger cleaning_materials_cost_aiud
  after insert or update or delete on public.cleaning_materials
  for each row execute function public.refresh_cleaning_materials_cost();

-- RLS
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.employees enable row level security;
alter table public.properties enable row level security;
alter table public.service_packages enable row level security;
alter table public.availability_slots enable row level security;
alter table public.cleanings enable row level security;
alter table public.cleaning_photos enable row level security;
alter table public.materials enable row level security;
alter table public.cleaning_materials enable row level security;

-- profiles
create policy profiles_select_own_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy profiles_update_own_or_admin on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- clients
create policy clients_admin_all on public.clients
  for all using (public.is_admin()) with check (public.is_admin());
create policy clients_select_own on public.clients
  for select using (user_id = auth.uid());

-- employees
create policy employees_admin_all on public.employees
  for all using (public.is_admin()) with check (public.is_admin());
create policy employees_select_own on public.employees
  for select using (user_id = auth.uid());

-- properties
create policy properties_admin_all on public.properties
  for all using (public.is_admin()) with check (public.is_admin());
create policy properties_client_select on public.properties
  for select using (client_id = public.my_client_id());
create policy properties_employee_select on public.properties
  for select using (
    exists (
      select 1 from public.cleanings cl
      where cl.property_id = properties.id
        and cl.employee_id = public.my_employee_id()
    )
  );

-- packages / materials (admin write, authenticated read)
create policy packages_admin_all on public.service_packages
  for all using (public.is_admin()) with check (public.is_admin());
create policy packages_select_auth on public.service_packages
  for select to authenticated using (true);

create policy materials_admin_all on public.materials
  for all using (public.is_admin()) with check (public.is_admin());
create policy materials_select_auth on public.materials
  for select to authenticated using (true);

-- availability: admin gerencia; cliente vê abertos; funcionária vê/atualiza os seus
create policy availability_admin_all on public.availability_slots
  for all using (public.is_admin()) with check (public.is_admin());
create policy availability_client_select_open on public.availability_slots
  for select using (is_open = true);
create policy availability_employee_select on public.availability_slots
  for select using (
    employee_id = public.my_employee_id() or employee_id is null
  );
create policy availability_employee_insert on public.availability_slots
  for insert with check (
    public.my_employee_id() is not null
    and (employee_id is null or employee_id = public.my_employee_id())
  );

-- cleanings
create policy cleanings_admin_all on public.cleanings
  for all using (public.is_admin()) with check (public.is_admin());
create policy cleanings_client_select on public.cleanings
  for select using (client_id = public.my_client_id());
create policy cleanings_client_insert on public.cleanings
  for insert with check (
    client_id = public.my_client_id()
    and status = 'requested'
  );
create policy cleanings_employee_select on public.cleanings
  for select using (employee_id = public.my_employee_id());
create policy cleanings_employee_update on public.cleanings
  for update using (employee_id = public.my_employee_id());

-- photos
create policy photos_admin_all on public.cleaning_photos
  for all using (public.is_admin()) with check (public.is_admin());
create policy photos_employee on public.cleaning_photos
  for all using (
    exists (
      select 1 from public.cleanings cl
      where cl.id = cleaning_photos.cleaning_id
        and cl.employee_id = public.my_employee_id()
    )
  )
  with check (
    exists (
      select 1 from public.cleanings cl
      where cl.id = cleaning_photos.cleaning_id
        and cl.employee_id = public.my_employee_id()
    )
  );
create policy photos_client_select on public.cleaning_photos
  for select using (
    exists (
      select 1 from public.cleanings cl
      where cl.id = cleaning_photos.cleaning_id
        and cl.client_id = public.my_client_id()
    )
  );

-- cleaning_materials
create policy cm_admin_all on public.cleaning_materials
  for all using (public.is_admin()) with check (public.is_admin());
create policy cm_employee on public.cleaning_materials
  for all using (
    exists (
      select 1 from public.cleanings cl
      where cl.id = cleaning_materials.cleaning_id
        and cl.employee_id = public.my_employee_id()
    )
  )
  with check (
    exists (
      select 1 from public.cleanings cl
      where cl.id = cleaning_materials.cleaning_id
        and cl.employee_id = public.my_employee_id()
    )
  );

-- Storage bucket (criar também no painel: cleaning-photos, privado)
insert into storage.buckets (id, name, public)
values ('cleaning-photos', 'cleaning-photos', false)
on conflict (id) do nothing;

create policy cleaning_photos_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'cleaning-photos');

create policy cleaning_photos_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cleaning-photos');

create policy cleaning_photos_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'cleaning-photos');

create policy cleaning_photos_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'cleaning-photos' and public.is_admin());
