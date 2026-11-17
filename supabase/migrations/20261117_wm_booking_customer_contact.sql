-- WM: customer contact added for newly booked appointments.
alter table public.wm_bookings
  add column if not exists customer_name text,
  add column if not exists customer_email text;

alter table public.wm_bookings
  add constraint wm_bookings_customer_name_valid
    check (customer_name is null or (char_length(btrim(customer_name)) between 2 and 100 and customer_name !~ '[[:cntrl:]]')),
  add constraint wm_bookings_customer_email_valid
    check (customer_email is null or (char_length(customer_email) <= 254 and customer_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'));

CREATE OR REPLACE FUNCTION private.wm_reserve_with_contact(p_service text, p_day date, p_slot time without time zone, p_token text, p_customer_name text, p_customer_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_minutes integer;
  v_name text;
  v_price numeric(8,2);
  v_day_of_week integer;
  v_close time;
  v_local_start timestamp;
  v_local_end timestamp;
  v_id uuid;
  v_customer_name text := btrim(p_customer_name);
  v_customer_email text := lower(btrim(p_customer_email));
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if p_day is null or p_slot is null or p_service is null
     or p_token is null or p_token !~ '^[a-f0-9]{64}$'
  then raise exception 'Dados da reserva inválidos.' using errcode='22023'; end if;

  if v_customer_name is null or char_length(v_customer_name) not between 2 and 100
     or v_customer_name ~ '[[:cntrl:]]'
  then raise exception 'Informe um nome válido (2 a 100 caracteres).' using errcode='22023'; end if;

  if v_customer_email is null or char_length(v_customer_email) > 254
     or v_customer_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  then raise exception 'Informe um e-mail válido.' using errcode='22023'; end if;

  if p_day <= v_today or p_day > v_today + 30 then
    raise exception 'Escolha uma data futura nos próximos 30 dias.' using errcode='22023'; end if;
  v_day_of_week := extract(dow from p_day);
  if v_day_of_week not between 2 and 6 then
    raise exception 'Atendemos de terça a sábado.' using errcode='22023'; end if;
  if p_slot < time '09:00' or extract(minute from p_slot) <> 0 or extract(second from p_slot) <> 0 then
    raise exception 'Selecione um horário disponível.' using errcode='22023'; end if;

  case p_service
    when 'cut' then v_name:='Corte masculino'; v_minutes:=40; v_price:=40;
    when 'beard' then v_name:='Barba'; v_minutes:=30; v_price:=30;
    when 'combo' then v_name:='Corte + barba'; v_minutes:=70; v_price:=55;
    when 'child' then v_name:='Corte infantil'; v_minutes:=40; v_price:=35;
    when 'eyebrow' then v_name:='Sobrancelha'; v_minutes:=20; v_price:=10;
    when 'neckline' then v_name:='Pezinho'; v_minutes:=15; v_price:=15;
    when 'pigment' then v_name:='Pigmentação'; v_minutes:=30; v_price:=30;
    when 'hydration' then v_name:='Hidratação capilar'; v_minutes:=30; v_price:=25;
    else raise exception 'Serviço inválido.' using errcode='22023';
  end case;

  v_close := case when v_day_of_week=6 then time '22:00' else time '20:00' end;
  v_local_start := p_day + p_slot;
  v_local_end := v_local_start + make_interval(mins=>v_minutes);
  if v_local_end::date<>p_day or v_local_end::time>v_close then
    raise exception 'O serviço não cabe no horário de funcionamento.' using errcode='22023'; end if;

  insert into public.wm_bookings(
    service_id,service_name,price_brl,booking_date,booking_time,starts_at,ends_at,
    cancel_token_hash,customer_name,customer_email
  ) values (
    p_service,v_name,v_price,p_day,p_slot,
    v_local_start at time zone 'America/Sao_Paulo',
    v_local_end at time zone 'America/Sao_Paulo',
    encode(sha256(convert_to(p_token,'UTF8')),'hex'),
    v_customer_name,v_customer_email
  ) returning id into v_id;

  return jsonb_build_object('id',v_id,'status','reservado','service',v_name,'date',p_day,'time',p_slot,'price',v_price);
exception when exclusion_violation then
  raise exception 'Horário já reservado. Escolha outro.' using errcode='23P01';
end
$function$
;

CREATE OR REPLACE FUNCTION public.wm_reserve_with_contact(p_service text, p_day date, p_slot time without time zone, p_token text, p_customer_name text, p_customer_email text)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select private.wm_reserve_with_contact(
    p_service,p_day,p_slot,p_token,p_customer_name,p_customer_email
  )
$function$
;

CREATE OR REPLACE FUNCTION private.wm_notify_make_on_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_webhook text;
begin
  if new.status <> 'reservado' then return new; end if;
  select ds.decrypted_secret into v_webhook
    from vault.decrypted_secrets as ds
    where ds.name='wm_make_webhook_url' limit 1;
  if v_webhook is null or v_webhook='' then
    raise warning 'WM: Make webhook não configurado';
    return new;
  end if;
  perform net.http_post(
    url := v_webhook,
    body := jsonb_build_object(
      'event_type','booking_created',
      'booking_id',new.id::text,
      'service_name',new.service_name,
      'customer_name',new.customer_name,
      'customer_email',new.customer_email,
      'starts_at',to_char(new.starts_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'ends_at',to_char(new.ends_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'status',new.status,
      'source','supabase',
      'test',false
    ),
    headers := jsonb_build_object('Content-Type','application/json'),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  raise warning 'WM: erro ao notificar Make sobre nova reserva: %',sqlerrm;
  return new;
end
$function$
;

revoke all on function private.wm_reserve_with_contact(text,date,time without time zone,text,text,text) from public,anon,authenticated;
revoke all on function public.wm_reserve_with_contact(text,date,time without time zone,text,text,text) from public;
grant execute on function public.wm_reserve_with_contact(text,date,time without time zone,text,text,text) to anon,authenticated;

notify pgrst, 'reload schema';
