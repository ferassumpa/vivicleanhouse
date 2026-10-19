-- Modelos de mensagem WhatsApp (início / fim da faxina)

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  body text not null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_templates enable row level security;

drop policy if exists notification_templates_admin_all on public.notification_templates;
create policy notification_templates_admin_all on public.notification_templates
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists notification_templates_select_auth on public.notification_templates;
create policy notification_templates_select_auth on public.notification_templates
  for select to authenticated using (true);

-- \U0001F60A = emoji 😊 (evita corromper o caractere ao colar SQL)
insert into public.notification_templates (key, title, body) values
(
  'cleaning_started',
  'Início da faxina',
  E'Olá, {cliente}! \U0001F60A\n\nA faxina no imóvel *{imovel}* foi *iniciada* às {hora}.\n\nQualquer coisa estamos à disposição.\n— Vivi Clean house'
),
(
  'cleaning_finished',
  'Fim da faxina',
  E'Olá, {cliente}! \U0001F60A\n\nA faxina no imóvel *{imovel}* foi *concluída* às {hora}.\n\nObrigada pela confiança!\n— Vivi Clean house'
)
on conflict (key) do nothing;
