-- WM Barbearia: esquema e API de agendamento.
-- Ref Supabase atzuglibamukkwhigmmq, sa-east-1. Arquivo reproduz a migracao wm_booking_backend_mvp.
-- O frontend usa somente a chave PUBLICAVEL e RPCs; nunca uma chave de servico.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.wm_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id text NOT NULL CHECK (service_id IN ('cut','beard','combo','child','eyebrow','neckline','pigment','hydration')),
  service_name text NOT NULL,
  price_brl numeric(8,2) NOT NULL CHECK (price_brl>=0),
  booking_date date NOT NULL,
  booking_time time NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'reservado' CHECK (status IN ('reservado','cancelado')),
  cancel_token_hash text NOT NULL CHECK (length(cancel_token_hash)=64),
  created_at timestamptz NOT NULL DEFAULT now(),
  canceled_at timestamptz,
  CONSTRAINT wm_booking_positive_duration CHECK (ends_at>starts_at),
  CONSTRAINT wm_booking_no_overlap EXCLUDE USING gist (tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE (status='reservado')
);
CREATE INDEX IF NOT EXISTS wm_bookings_day_idx ON public.wm_bookings(booking_date) WHERE (status='reservado');
ALTER TABLE public.wm_bookings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.wm_bookings FROM PUBLIC, anon, authenticated;
-- Sem politicas anonimas de tabela: leitura e escrita ocorrem so por funcoes privadas validadas.

CREATE OR REPLACE FUNCTION private.wm_busy(p_from date, p_to date)
 RETURNS TABLE(day date, slot time without time zone, ending time without time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to<p_from OR p_to>p_from+30
    OR p_from < (now() AT TIME ZONE 'America/Sao_Paulo')::date
    OR p_from > (now() AT TIME ZONE 'America/Sao_Paulo')::date+30
  THEN RAISE EXCEPTION 'Intervalo inválido.' USING ERRCODE='22023'; END IF;
  RETURN QUERY SELECT b.booking_date,b.booking_time,(b.ends_at AT TIME ZONE 'America/Sao_Paulo')::time
  FROM public.wm_bookings b
  WHERE b.status='reservado' AND b.booking_date BETWEEN p_from AND p_to ORDER BY b.booking_date,b.booking_time;
END
$function$;

CREATE OR REPLACE FUNCTION private.wm_cancel(p_id uuid, p_token text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_id uuid;
BEGIN
  IF p_id IS NULL OR p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
  UPDATE public.wm_bookings SET status='cancelado',canceled_at=now()
  WHERE id=p_id AND status='reservado' AND cancel_token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex')
  RETURNING id INTO v_id;
  RETURN v_id IS NOT NULL;
END
$function$;

CREATE OR REPLACE FUNCTION private.wm_reserve(p_service text, p_day date, p_slot time without time zone, p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_minutes integer;
  v_name text;
  v_price numeric(8,2);
  v_day_of_week integer;
  v_close time;
  v_local_start timestamp;
  v_local_end timestamp;
  v_id uuid;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF p_day IS NULL OR p_slot IS NULL OR p_service IS NULL
    OR p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$'
  THEN RAISE EXCEPTION 'Dados da reserva inválidos.' USING ERRCODE='22023'; END IF;
  IF p_day <= v_today OR p_day > v_today + 30 THEN
    RAISE EXCEPTION 'Escolha uma data futura nos próximos 30 dias.' USING ERRCODE='22023';
  END IF;
  v_day_of_week := EXTRACT(DOW FROM p_day);
  IF v_day_of_week NOT BETWEEN 2 AND 6 THEN
    RAISE EXCEPTION 'Atendemos de terça a sábado.' USING ERRCODE='22023';
  END IF;
  IF p_slot < time '09:00' OR EXTRACT(MINUTE FROM p_slot)<>0 OR EXTRACT(SECOND FROM p_slot)<>0 THEN
    RAISE EXCEPTION 'Selecione um horário disponível.' USING ERRCODE='22023';
  END IF;
  CASE p_service
    WHEN 'cut' THEN v_name:='Corte masculino'; v_minutes:=40; v_price:=40;
    WHEN 'beard' THEN v_name:='Barba'; v_minutes:=30; v_price:=30;
    WHEN 'combo' THEN v_name:='Corte + barba'; v_minutes:=70; v_price:=55;
    WHEN 'child' THEN v_name:='Corte infantil'; v_minutes:=40; v_price:=35;
    WHEN 'eyebrow' THEN v_name:='Sobrancelha'; v_minutes:=20; v_price:=10;
    WHEN 'neckline' THEN v_name:='Pezinho'; v_minutes:=15; v_price:=15;
    WHEN 'pigment' THEN v_name:='Pigmentação'; v_minutes:=30; v_price:=30;
    WHEN 'hydration' THEN v_name:='Hidratação capilar'; v_minutes:=30; v_price:=25;
    ELSE RAISE EXCEPTION 'Serviço inválido.' USING ERRCODE='22023';
  END CASE;
  v_close := CASE WHEN v_day_of_week=6 THEN time '22:00' ELSE time '20:00' END;
  v_local_start := p_day + p_slot;
  v_local_end := v_local_start + make_interval(mins=>v_minutes);
  IF v_local_end::date<>p_day OR v_local_end::time>v_close THEN
    RAISE EXCEPTION 'O serviço não cabe no horário de funcionamento.' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.wm_bookings(service_id,service_name,price_brl,booking_date,booking_time,starts_at,ends_at,cancel_token_hash)
  VALUES (p_service,v_name,v_price,p_day,p_slot,v_local_start AT TIME ZONE 'America/Sao_Paulo',v_local_end AT TIME ZONE 'America/Sao_Paulo',
    encode(sha256(convert_to(p_token,'UTF8')),'hex'))
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id',v_id,'status','reservado','service',v_name,'date',p_day,'time',p_slot,'price',v_price);
EXCEPTION WHEN exclusion_violation THEN
  RAISE EXCEPTION 'Horário já reservado. Escolha outro.' USING ERRCODE='23P01';
END
$function$;

CREATE OR REPLACE FUNCTION private.wm_status(p_id uuid, p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_status text;
BEGIN
  IF p_id IS NULL OR p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN RETURN NULL; END IF;
  SELECT b.status INTO v_status FROM public.wm_bookings b
  WHERE b.id=p_id AND b.cancel_token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  IF v_status IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('status',v_status);
END
$function$;

CREATE OR REPLACE FUNCTION public.wm_busy(p_from date, p_to date)
 RETURNS TABLE(day date, slot time without time zone, ending time without time zone)
 LANGUAGE sql
 SET search_path TO ''
AS $function$ SELECT * FROM private.wm_busy(p_from,p_to) $function$;

CREATE OR REPLACE FUNCTION public.wm_cancel(p_id uuid, p_token text)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$ SELECT private.wm_cancel(p_id,p_token) $function$;

CREATE OR REPLACE FUNCTION public.wm_reserve(p_service text, p_day date, p_slot time without time zone, p_token text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ SELECT private.wm_reserve(p_service,p_day,p_slot,p_token) $function$;

CREATE OR REPLACE FUNCTION public.wm_status(p_id uuid, p_token text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ SELECT private.wm_status(p_id,p_token) $function$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wm_reserve(text,date,time,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wm_busy(date,date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wm_cancel(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wm_status(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wm_reserve(text,date,time,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wm_busy(date,date) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wm_cancel(uuid,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wm_status(uuid,text) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
