-- Pacotes de serviço: faxinas, mensal, extras (roupa, louça, passar)

alter table public.service_packages
  add column if not exists cleanings_count int not null default 1,
  add column if not exists is_monthly boolean not null default false,
  add column if not exists includes_laundry boolean not null default false,
  add column if not exists includes_dishes boolean not null default false,
  add column if not exists includes_ironing boolean not null default false,
  add column if not exists extras text;

comment on column public.service_packages.cleanings_count is 'Quantidade de faxinas inclusas no pacote';
comment on column public.service_packages.is_monthly is 'Se o pacote é recorrente por mês';
comment on column public.service_packages.includes_laundry is 'Inclui lavagem de roupa';
comment on column public.service_packages.includes_dishes is 'Inclui lavagem de louça';
comment on column public.service_packages.includes_ironing is 'Inclui passar roupas';
comment on column public.service_packages.extras is 'Observações / outros itens inclusos';

-- Pacote padrão opcional no imóvel
alter table public.properties
  add column if not exists service_package_id uuid references public.service_packages (id) on delete set null;
