-- Prédios + vínculo em imóveis + checklist padrão / por apartamento

create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  syndic_name text,
  syndic_phone text,
  doorman_name text,
  doorman_phone text,
  caretaker_name text,
  caretaker_phone text,
  entry_rules text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.properties
  add column if not exists building_id uuid references public.buildings (id) on delete set null;

-- Checklist: property_id null = item do checklist padrão global
create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties (id) on delete cascade,
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists checklist_items_property_idx
  on public.checklist_items (property_id);

-- Itens marcados em cada faxina
create table if not exists public.cleaning_checklist (
  id uuid primary key default gen_random_uuid(),
  cleaning_id uuid not null references public.cleanings (id) on delete cascade,
  checklist_item_id uuid references public.checklist_items (id) on delete set null,
  label text not null,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists cleaning_checklist_cleaning_idx
  on public.cleaning_checklist (cleaning_id);

alter table public.buildings enable row level security;
alter table public.checklist_items enable row level security;
alter table public.cleaning_checklist enable row level security;

drop policy if exists buildings_admin_all on public.buildings;
create policy buildings_admin_all on public.buildings
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists buildings_select_auth on public.buildings;
create policy buildings_select_auth on public.buildings
  for select to authenticated using (true);

drop policy if exists checklist_items_admin_all on public.checklist_items;
create policy checklist_items_admin_all on public.checklist_items
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists checklist_items_select_auth on public.checklist_items;
create policy checklist_items_select_auth on public.checklist_items
  for select to authenticated using (true);

drop policy if exists cleaning_checklist_admin_all on public.cleaning_checklist;
create policy cleaning_checklist_admin_all on public.cleaning_checklist
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists cleaning_checklist_employee on public.cleaning_checklist;
create policy cleaning_checklist_employee on public.cleaning_checklist
  for all using (
    exists (
      select 1 from public.cleanings cl
      where cl.id = cleaning_checklist.cleaning_id
        and cl.employee_id = public.my_employee_id()
    )
  )
  with check (
    exists (
      select 1 from public.cleanings cl
      where cl.id = cleaning_checklist.cleaning_id
        and cl.employee_id = public.my_employee_id()
    )
  );

drop policy if exists cleaning_checklist_client_select on public.cleaning_checklist;
create policy cleaning_checklist_client_select on public.cleaning_checklist
  for select using (
    exists (
      select 1 from public.cleanings cl
      where cl.id = cleaning_checklist.cleaning_id
        and cl.client_id = public.my_client_id()
    )
  );

-- Seed checklist padrão (só se ainda não houver itens globais)
insert into public.checklist_items (property_id, label, sort_order)
select null, x.label, x.sort_order
from (values
  ('Limpar banheiro', 10),
  ('Limpar cozinha / pia', 20),
  ('Trocar / organizar roupa de cama', 30),
  ('Aspirar / varrer pisos', 40),
  ('Passar pano nos pisos', 50),
  ('Tirar o lixo', 60),
  ('Limpar espelhos e vidros', 70),
  ('Conferir itens do studio', 80)
) as x(label, sort_order)
where not exists (
  select 1 from public.checklist_items ci where ci.property_id is null
);
