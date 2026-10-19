-- Garante: só admin altera dados de agendamento da faxina.
-- Funcionária pode só avançar status / horários de execução / custos operacionais leves.

create or replace function public.guard_cleaning_employee_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  -- Funcionária não pode mudar o que a admin agenda
  if
    old.property_id is distinct from new.property_id
    or old.client_id is distinct from new.client_id
    or old.employee_id is distinct from new.employee_id
    or old.scheduled_start is distinct from new.scheduled_start
    or old.scheduled_end is distinct from new.scheduled_end
    or old.pricing_type is distinct from new.pricing_type
    or old.unit_price is distinct from new.unit_price
    or old.hours is distinct from new.hours
    or old.revenue_amount is distinct from new.revenue_amount
    or old.employee_pay_amount is distinct from new.employee_pay_amount
    or old.availability_slot_id is distinct from new.availability_slot_id
  then
    raise exception 'Somente a admin pode editar o agendamento da faxina';
  end if;

  return new;
end;
$$;

drop trigger if exists cleanings_guard_employee_updates on public.cleanings;
create trigger cleanings_guard_employee_updates
  before update on public.cleanings
  for each row execute function public.guard_cleaning_employee_updates();

-- Funcionária não pode apagar faxina
drop policy if exists cleanings_employee_delete on public.cleanings;
-- (não criar policy de delete para employee — só admin via cleanings_admin_all)
