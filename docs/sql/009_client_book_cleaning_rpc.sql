-- Reserva de horário pelo cliente (sem service role no servidor).
-- Rode no SQL Editor do Supabase após 001–008.

create or replace function public.book_cleaning_request(
  p_property_id uuid,
  p_slot_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_prop public.properties%rowtype;
  v_slot public.availability_slots%rowtype;
  v_cleaning_id uuid;
  v_pricing_type public.pricing_type;
  v_unit_price numeric(10, 2);
  v_hours numeric(6, 2);
  v_revenue numeric(10, 2);
  v_start timestamptz;
  v_end timestamptz;
  v_pkg_price numeric(10, 2);
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  v_client_id := public.my_client_id();
  if v_client_id is null then
    raise exception 'Conta de cliente não vinculada';
  end if;

  select * into v_prop
  from public.properties
  where id = p_property_id
    and client_id = v_client_id
    and active = true;

  if not found then
    raise exception 'Imóvel inválido';
  end if;

  select * into v_slot
  from public.availability_slots
  where id = p_slot_id
    and is_open = true
  for update;

  if not found then
    raise exception 'Esse horário não está mais disponível. Escolha outro.';
  end if;

  v_pricing_type := v_prop.default_pricing_type;

  if v_pricing_type = 'hourly' then
    v_unit_price := coalesce(v_prop.price_hourly, 0);
    v_hours := greatest(coalesce(v_prop.estimated_duration_minutes, 120), 120) / 60.0;
    v_revenue := v_unit_price * v_hours;
  elsif v_pricing_type = 'package' then
    v_unit_price := coalesce(v_prop.price_package, 0);
    if v_prop.service_package_id is not null then
      select sp.price into v_pkg_price
      from public.service_packages sp
      where sp.id = v_prop.service_package_id;
      v_unit_price := coalesce(v_pkg_price, v_unit_price);
    end if;
    v_hours := null;
    v_revenue := v_unit_price;
  else
    v_unit_price := coalesce(v_prop.price_fixed, 0);
    v_hours := null;
    v_revenue := v_unit_price;
  end if;

  v_start := (v_slot.slot_date::text || 'T' || v_slot.start_time::text)::timestamptz;
  v_end := (v_slot.slot_date::text || 'T' || v_slot.end_time::text)::timestamptz;

  update public.availability_slots
  set is_open = false
  where id = p_slot_id
    and is_open = true;

  if not found then
    raise exception 'Esse horário acabou de ser reservado. Atualize a página.';
  end if;

  insert into public.cleanings (
    property_id,
    client_id,
    availability_slot_id,
    scheduled_start,
    scheduled_end,
    status,
    pricing_type,
    unit_price,
    hours,
    revenue_amount,
    employee_pay_amount,
    notes
  ) values (
    p_property_id,
    v_client_id,
    p_slot_id,
    v_start,
    v_end,
    'requested',
    v_pricing_type,
    v_unit_price,
    v_hours,
    v_revenue,
    0,
    'Solicitação do cliente — aguardando confirmação da admin'
  )
  returning id into v_cleaning_id;

  return v_cleaning_id;
exception
  when others then
    -- Se o insert falhar depois de fechar o slot, reabre a vaga
    update public.availability_slots
    set is_open = true
    where id = p_slot_id
      and not exists (
        select 1 from public.cleanings c
        where c.availability_slot_id = p_slot_id
          and c.status <> 'cancelled'
      );
    raise;
end;
$$;

revoke all on function public.book_cleaning_request(uuid, uuid) from public;
grant execute on function public.book_cleaning_request(uuid, uuid) to authenticated;
