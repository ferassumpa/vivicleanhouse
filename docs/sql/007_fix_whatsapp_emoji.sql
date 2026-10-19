-- Corrige modelos em que o emoji 😊 virou "?" (encoding)
-- Usa escape Unicode do Postgres (\U0001F60A = 😊)

update public.notification_templates
set
  body = E'Olá, {cliente}! \U0001F60A\n\nA faxina no imóvel *{imovel}* foi *iniciada* às {hora}.\n\nQualquer coisa estamos à disposição.\n— Vivi Clean house',
  updated_at = now()
where key = 'cleaning_started';

update public.notification_templates
set
  body = E'Olá, {cliente}! \U0001F60A\n\nA faxina no imóvel *{imovel}* foi *concluída* às {hora}.\n\nObrigada pela confiança!\n— Vivi Clean house',
  updated_at = now()
where key = 'cleaning_finished';
