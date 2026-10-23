-- Operators may create/edit only in their assigned owning modules. Reading
-- dependencies does not grant writing. Deletes and Auth profiles stay admin-only.
-- Existing business rows are not updated or deleted by this migration.
begin;

create or replace function private_security.can_write_modules(required_modules text[])
returns boolean language sql stable security definer set search_path='' as $$
  select (select private_security.mfa_satisfied()) and exists (
    select 1 from public.system_users staff where staff.auth_user_id=(select auth.uid())
    and (staff.role='administrador' or (staff.role in ('funcionario','gerente')
      and coalesce(staff.modules,'{}'::text[]) && required_modules))
  );
$$;
revoke all on function private_security.can_write_modules(text[]) from public,anon;
grant execute on function private_security.can_write_modules(text[]) to authenticated,service_role;

do $$
declare permission record;
begin
  for permission in select * from (values
    ('vehicles',array['frota']::text[]),('clients',array['clientes']::text[]),
    ('rentals',array['locacao']::text[]),('leads',array['leads']::text[]),
    ('transactions',array['financeiro','faturamento']::text[]),
    ('maintenances',array['manutencaoAdmin','oficina']::text[]),
    ('inspections',array['vistoria']::text[]),('service_orders',array['oficina','manutencaoAdmin']::text[]),
    ('replacement_contracts',array['locacao','oficina']::text[]),('system_fines',array['multas']::text[]),
    ('fines',array['multas']::text[]),('oil_changes',array['oficina','manutencaoAdmin']::text[]),
    ('workshop_appointments',array['oficina']::text[]),('workshop_quotes',array['oficina']::text[]),
    ('workshop_inventory',array['oficina']::text[]),('workshop_financials',array['oficina']::text[]),
    ('investor_payouts',array['investidores']::text[]),('investor_notices',array['investidores']::text[])
  ) as write_map(table_name,modules)
  loop
    if to_regclass(format('public.%I',permission.table_name)) is null then continue; end if;
    execute format('alter policy staff_insert on public.%I with check ((select private_security.can_write_modules(%L::text[])))',permission.table_name,permission.modules);
    execute format('alter policy staff_update on public.%I using ((select private_security.can_write_modules(%L::text[]))) with check ((select private_security.can_write_modules(%L::text[])))',permission.table_name,permission.modules,permission.modules);
  end loop;
end $$;

-- Operators use atomic RPCs for these cross-table operations. Keep only the
-- existing administrator maintenance path for direct business-table DML.
alter policy staff_insert on public.rentals with check ((select private_security.is_admin()));
alter policy staff_insert on public.maintenances with check ((select private_security.is_admin()));
alter policy staff_update on public.maintenances using ((select private_security.is_admin())) with check ((select private_security.is_admin()));

-- Billing may settle a fine, but may not rewrite its amount, vehicle or driver.
create or replace function private_security.guard_billing_fine_update()
returns trigger language plpgsql security definer set search_path='' as $$
declare before_row jsonb=to_jsonb(old);after_row jsonb=to_jsonb(new);before_paid jsonb;after_paid jsonb;
  parcel_count integer;before_count integer;after_count integer;distinct_count integer;parcel record;
begin
  if current_user in ('postgres','supabase_admin') and auth.uid() is null then return new; end if;
  if private_security.can_write_modules(array['multas']) then return new; end if;
  if not private_security.can_write_modules(array['faturamento'])
    or after_row-array['status','paid_installments']<>before_row-array['status','paid_installments'] then
    raise exception using errcode='42501',message='Somente a baixa de parcelas da multa é permitida no Faturamento.';
  end if;
  if before_row=after_row then return new; end if;
  parcel_count=greatest(coalesce((before_row->>'installments')::integer,1),1);
  before_paid=coalesce(nullif(before_row->'paid_installments','null'::jsonb),'[]'::jsonb);
  after_paid=coalesce(nullif(after_row->'paid_installments','null'::jsonb),'[]'::jsonb);
  if jsonb_typeof(before_paid)<>'array' or jsonb_typeof(after_paid)<>'array' then
    raise exception using errcode='42501',message='Histórico de parcelas inválido.';
  end if;
  for parcel in select value from jsonb_array_elements(after_paid) loop
    if (parcel.value#>>'{}') !~ '^[1-9][0-9]*$' or length(parcel.value#>>'{}')>8 then
      raise exception using errcode='42501',message='Parcela inválida.';
    end if;
    if (parcel.value#>>'{}')::integer>parcel_count then raise exception using errcode='42501',message='Parcela fora da multa.'; end if;
  end loop;
  select count(*),count(distinct(value#>>'{}')) into after_count,distinct_count from jsonb_array_elements(after_paid);
  before_count=jsonb_array_length(before_paid);
  if after_count<>distinct_count or after_count<before_count or after_count>before_count+1 or exists(
    select 1 from jsonb_array_elements(before_paid) old_item where not exists(
      select 1 from jsonb_array_elements(after_paid) new_item where old_item#>>'{}'=new_item#>>'{}')) then
    raise exception using errcode='42501',message='Parcelas pagas não podem ser removidas, duplicadas ou alteradas.';
  end if;
  if (after_count>=parcel_count or parcel_count=1) and new.status in ('Pago','Paga') then return new; end if;
  if after_count>0 and after_count<parcel_count and new.status='Em Cobrança' then return new; end if;
  raise exception using errcode='42501',message='Estado incompatível com as parcelas pagas.';
end $$;
do $$
declare target text;
begin
  foreach target in array array['fines','system_fines'] loop
    if to_regclass(format('public.%I',target)) is null then continue; end if;
    execute format('alter policy staff_update on public.%I using ((select private_security.can_write_modules(array[''multas'',''faturamento'']::text[]))) with check ((select private_security.can_write_modules(array[''multas'',''faturamento'']::text[])))',target);
    execute format('drop trigger if exists billing_fine_update_guard on public.%I',target);
    execute format('create trigger billing_fine_update_guard before update on public.%I for each row execute function private_security.guard_billing_fine_update()',target);
  end loop;
end $$;

-- Store only request ownership, a SHA-256 fingerprint and resulting IDs. No
-- credential or duplicate personal payload is retained. No FK prevents a later
-- authorized deletion of an Auth account or historical business record.
create table if not exists private_security.rental_requests (
  actor_id uuid not null,request_id uuid not null,operation text not null check(operation in ('create','update','deposit','maintenance')),
  payload_hash text not null,rental_id uuid,previous_vehicle_id uuid,maintenance_id uuid,transaction_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),primary key(actor_id,request_id)
);
alter table private_security.rental_requests enable row level security;
revoke all on private_security.rental_requests from public,anon,authenticated,service_role;

create or replace function private_security.stable_rental_document_ref(reference text)
returns boolean language sql immutable set search_path='' as $$
  select coalesce(length(reference)<=4096 and reference !~ '[?#]' and reference !~ '(^|/)\.\.(/|$)' and
    (reference like 'storage://La-locacao/%'
      or reference like 'https://ucfzkzpmvjekgotexriq.supabase.co/storage/v1/object/public/La-locacao/%'),false);
$$;
create or replace function private_security.rental_document_value_valid(document_value jsonb,depth integer default 0)
returns boolean language plpgsql immutable set search_path='' as $$
declare child jsonb; entry record; text_value text;
begin
  if depth>20 or octet_length(document_value::text)>1048576 then return false; end if;
  case jsonb_typeof(document_value)
    when 'object' then
      for entry in select key,value from jsonb_each(document_value) loop
        if entry.key in ('cnh','residence','signedContract') and entry.value<>'null'::jsonb
          and (jsonb_typeof(entry.value)<>'string' or not private_security.stable_rental_document_ref(entry.value#>>'{}')) then return false; end if;
        if entry.key='appPrints' and entry.value<>'null'::jsonb then
          if jsonb_typeof(entry.value)<>'array' then return false; end if;
          for child in select value from jsonb_array_elements(entry.value) loop
            if jsonb_typeof(child)<>'string' or not private_security.stable_rental_document_ref(child#>>'{}') then return false; end if;
          end loop;
        end if;
        if not private_security.rental_document_value_valid(entry.value,depth+1) then return false; end if;
      end loop;
    when 'array' then
      for child in select value from jsonb_array_elements(document_value) loop
        if not private_security.rental_document_value_valid(child,depth+1) then return false; end if;
      end loop;
    when 'string' then
      text_value=document_value#>>'{}';
      if text_value ~* '^(https?|storage|blob|data|javascript|file):' then
        if not private_security.stable_rental_document_ref(text_value) then return false; end if;
      end if;
    else null;
  end case;
  return true;
end $$;

create or replace function private_security.rental_columns()
returns text[] language sql immutable set search_path='' as $$
  select array['id_veiculo','id_cliente','start_date','end_date','value','status','user_name','client_phone','e-mail',
    'cnh_number','cnh_validity','data_de_nascimento','registro_cnh','cnh_código_de_segurança','modelo','placa','tipo',
    'semanas','total do depósito','caução_paga','imposto_de_pneus','deposit_installments','multa_tardia',
    'juros_diários','observações','documentos','contrato_assinado']::text[];
$$;

create or replace function private_security.rental_record(payload jsonb,previous_row public.rentals)
returns public.rentals language plpgsql set search_path='' as $$
declare result public.rentals; merged jsonb; amount numeric;
begin
  if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>1048576
    or payload-private_security.rental_columns()<>'{}'::jsonb then
    raise exception using errcode='22023',message='Campos da locação inválidos.';
  end if;
  if payload?'documentos' and jsonb_typeof(payload->'documentos') not in ('object','null') then
    raise exception using errcode='22023',message='Documentos da locação inválidos.';
  end if;
  merged=coalesce(to_jsonb(previous_row),'{}'::jsonb)||payload;
  merged=jsonb_set(merged,'{documentos}',coalesce(previous_row.documentos,'{}'::jsonb)||coalesce(nullif(payload->'documentos','null'::jsonb),'{}'::jsonb));
  result=jsonb_populate_record(null::public.rentals,merged);
  if previous_row.id is not null then
    result.id_veiculo=coalesce(result.id_veiculo,previous_row."id_do_veículo");
    result.id_cliente=coalesce(result.id_cliente,previous_row."id_do_cliente");
  end if;
  if not private_security.rental_document_value_valid(result.documentos)
    or (nullif(result.contrato_assinado,'') is not null and not private_security.stable_rental_document_ref(result.contrato_assinado)) then
    raise exception using errcode='22023',message='Use referências estáveis de documentos autorizados.';
  end if;
  if result.documentos->>'signedContract' is not null then result.contrato_assinado=result.documentos->>'signedContract'; end if;
  if result.id_veiculo is null or result.start_date is null or result.value is null
    or result.value<0 or result.value::text in ('NaN','Infinity','-Infinity')
    or result.end_date<result.start_date or length(coalesce(result.user_name,''))>300 then
    raise exception using errcode='22023',message='Veículo, datas ou valor da locação inválidos.';
  end if;
  foreach amount in array array[result."total do depósito",result."caução_paga",result.imposto_de_pneus,result.multa_tardia,result."juros_diários"] loop
    if amount<0 or amount::text in ('NaN','Infinity','-Infinity') then
      raise exception using errcode='22023',message='Valores da locação inválidos.';
    end if;
  end loop;
  if coalesce(result."caução_paga",0)>coalesce(result."total do depósito",0) then raise exception using errcode='22023',message='Caução paga excede o total do contrato.'; end if;
  if result.deposit_installments<0 or result.deposit_installments>10000 then
    raise exception using errcode='22023',message='Parcelas inválidas.';
  end if;
  return result;
end $$;

create or replace function private_security.sync_rental_client(payload jsonb,existing_id uuid)
returns public.clients language plpgsql set search_path='' as $$
declare previous_row public.clients; candidate public.clients; result public.clients; identity_value text; identity_field text; matches integer; merged jsonb;
begin
  if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>1048576 or
    payload-array['nome','telefone','e-mail','cpf','address','cnh_number','cnh_validity','registro_cnh','data_de_nascimento','documentos','status']<>'{}'::jsonb then
    raise exception using errcode='22023',message='Campos do cliente inválidos.';
  end if;
  if payload?'documentos' and jsonb_typeof(payload->'documentos') not in ('object','null') then
    raise exception using errcode='22023',message='Documentos do cliente inválidos.';
  end if;
  -- Lock both supplied identity keys before selecting/updating a client row.
  foreach identity_field in array array['cpf','cnh_number'] loop
    identity_value=nullif(trim(payload->>identity_field),'');
    if identity_value is not null then perform pg_advisory_xact_lock(hashtextextended('rental-client:'||identity_field||':'||identity_value,0)); end if;
  end loop;
  if existing_id is not null then
    select * into previous_row from public.clients where id=existing_id for update;
    if not found then raise exception using errcode='22023',message='Cliente vinculado não encontrado.'; end if;
  end if;
  foreach identity_field in array array['cpf','cnh_number'] loop
    identity_value=nullif(trim(payload->>identity_field),'');
    if identity_value is not null then
      execute format('select count(*) from public.clients where %I=$1',identity_field) into matches using identity_value;
      if matches>1 then raise exception using errcode='23505',message='Identidade de cliente duplicada; revise antes de salvar.'; end if;
      if matches=1 then
        execute format('select * from public.clients where %I=$1 for update',identity_field) into candidate using identity_value;
        if previous_row.id is not null and previous_row.id<>candidate.id then
          raise exception using errcode='23505',message='Dados apontam clientes diferentes; revise antes de salvar.';
        end if;
        previous_row=candidate;
      end if;
    end if;
  end loop;
  merged=coalesce(to_jsonb(previous_row),'{}'::jsonb)||payload;
  merged=jsonb_set(merged,'{documentos}',coalesce(previous_row.documentos,'{}'::jsonb)||coalesce(nullif(payload->'documentos','null'::jsonb),'{}'::jsonb));
  result=jsonb_populate_record(null::public.clients,merged);
  if nullif(trim(result.nome),'') is null or length(result.nome)>300 or not private_security.rental_document_value_valid(result.documentos) then
    raise exception using errcode='22023',message='Nome ou documentos do cliente inválidos.';
  end if;
  if previous_row.id is null then
    insert into public.clients(id,nome,telefone,"e-mail",cpf,address,cnh_number,cnh_validity,registro_cnh,data_de_nascimento,documentos,status)
    values(gen_random_uuid(),result.nome,result.telefone,result."e-mail",result.cpf,result.address,result.cnh_number,result.cnh_validity,result.registro_cnh,result.data_de_nascimento,result.documentos,coalesce(result.status,'Ativo')) returning * into result;
  else
    update public.clients set nome=result.nome,telefone=result.telefone,"e-mail"=result."e-mail",cpf=result.cpf,address=result.address,
      cnh_number=result.cnh_number,cnh_validity=result.cnh_validity,registro_cnh=result.registro_cnh,
      data_de_nascimento=result.data_de_nascimento,documentos=result.documentos,status=result.status
    where id=previous_row.id returning * into result;
  end if;
  return result;
end $$;

create or replace function private_security.rental_response(target_id uuid,created_transactions uuid[])
returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('rental',to_jsonb(r),'client',(select to_jsonb(c) from public.clients c where c.id=r.id_cliente),
    'transactions',coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.transactions t where t.id=any(created_transactions)),'[]'::jsonb),
    'vehicle',(select to_jsonb(v) from public.vehicles v where v.id=r.id_veiculo)) from public.rentals r where r.id=target_id;
$$;

create or replace function public.create_rental_atomic(p_request_id uuid,p_rental jsonb,p_client jsonb,p_payment_day integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid=auth.uid(); fingerprint text; request_row private_security.rental_requests; rental public.rentals;
  client public.clients; vehicle public.vehicles; columns_sql text; values_sql text; tx_ids uuid[]='{}'; tx_id uuid;
  rate numeric; admin_part numeric; tire numeric; days integer=7; proportional boolean=false; transaction_date date; response jsonb;
begin
  if not private_security.can_write_modules(array['locacao']) then raise exception using errcode='42501',message='Módulo Locações não autorizado.'; end if;
  if p_request_id is null or (p_payment_day is not null and p_payment_day not between 0 and 6) then
    raise exception using errcode='22023',message='Identificador da operação ou dia de pagamento inválido.';
  end if;
  if p_rental is null or p_client is null or octet_length(p_rental::text)>1048576 or octet_length(p_client::text)>1048576 then raise exception using errcode='22023',message='Dados da operação inválidos.'; end if;
  fingerprint=encode(sha256(convert_to(jsonb_build_object('operation','create','rental',p_rental,'client',p_client,'payment_day',p_payment_day)::text,'UTF8')),'hex');
  insert into private_security.rental_requests(actor_id,request_id,operation,payload_hash) values(actor,p_request_id,'create',fingerprint) on conflict do nothing;
  select * into request_row from private_security.rental_requests where actor_id=actor and request_id=p_request_id for update;
  if request_row.operation<>'create' or request_row.payload_hash<>fingerprint then raise exception using errcode='22023',message='Identificador já utilizado com outros dados.'; end if;
  if request_row.rental_id is not null then
    response=private_security.rental_response(request_row.rental_id,request_row.transaction_ids);
    if response is null then raise exception using errcode='23505',message='Registro da operação não está mais disponível.'; end if;
    return response;
  end if;
  rental=private_security.rental_record(p_rental,null::public.rentals);
  if p_rental?'status' and p_rental->>'status'<>'Ativo' then raise exception using errcode='22023',message='Nova locação deve estar ativa.'; end if;
  rental.id=gen_random_uuid(); rental.created_at=now(); rental.status='Ativo';
  select * into vehicle from public.vehicles where id=rental.id_veiculo for update;
  if not found then raise exception using errcode='22023',message='Veículo não encontrado.'; end if;
  if exists(select 1 from public.rentals r where coalesce(r.id_veiculo,r."id_do_veículo")=vehicle.id and coalesce(r.status,'Ativo') not in ('Encerrado','Finalizado','Cancelado','Inativo')) then
    raise exception using errcode='23505',message='Veículo já possui locação ativa.';
  end if;
  client=private_security.sync_rental_client(p_client,rental.id_cliente);
  rental.id_cliente=client.id; rental.user_name=client.nome; rental.placa=vehicle.plate; rental.modelo=vehicle.model;
  rental.documentos=jsonb_set(rental.documentos,'{payment_day}',coalesce(to_jsonb(p_payment_day),'null'::jsonb));
  select string_agg(format('%I',column_name),','),string_agg(format('($1).%I',column_name),',') into columns_sql,values_sql from unnest(private_security.rental_columns()) column_name;
  execute format('insert into public.rentals(id,created_at,%s) select ($1).id,($1).created_at,%s returning *',columns_sql,values_sql) into rental using rental;
  rate=rental.value; tire=coalesce(rental.imposto_de_pneus,0); transaction_date=rental.start_date;
  if p_payment_day is not null and extract(dow from rental.start_date)::integer<>p_payment_day then
    proportional=true;days=(p_payment_day-extract(dow from rental.start_date)::integer+7)%7;rate=rate/7*days;
  end if;
  if coalesce(vehicle.admin_tax,20)<0 or coalesce(vehicle.admin_tax,20)>100 then raise exception using errcode='22023',message='Taxa administrativa do veículo inválida.'; end if;
  admin_part=rate*coalesce(vehicle.admin_tax,20)/100;
  if coalesce(rental.tipo,'')<>'daily' then
    if rate>0 then
      insert into public.transactions(id,type,val,cat,"desc",date,vehicle_plate,status,responsible)
      values(gen_random_uuid(),'in',rate,'Aluguel','Primeiro Aluguel '||case when proportional then '(Proporcional '||days||'d)' else '(Automático)' end||' - '||coalesce(rental.user_name,''),transaction_date,vehicle.plate,'Concluído','') returning id into tx_id;tx_ids=array_append(tx_ids,tx_id);
    end if;
    if admin_part>0 then
      insert into public.transactions(id,type,val,cat,"desc",date,vehicle_plate,status,responsible)
      values(gen_random_uuid(),'in',admin_part,'Taxa Adm','Taxa Adm Primeiro Aluguel '||case when proportional then '('||days||'d)' else '' end||' - '||coalesce(rental.user_name,''),transaction_date,vehicle.plate,'Concluído','Administradora') returning id into tx_id;tx_ids=array_append(tx_ids,tx_id);
    end if;
    if tire>0 then
      insert into public.transactions(id,type,val,cat,"desc",date,vehicle_plate,status,responsible)
      values(gen_random_uuid(),'in',tire,'taxa de pneus','Taxa de Pneus Primeiro Aluguel '||case when proportional then '('||days||'d)' else '' end||' - '||coalesce(rental.user_name,''),transaction_date,vehicle.plate,'Concluído','Administradora') returning id into tx_id;tx_ids=array_append(tx_ids,tx_id);
    end if;
  end if;
  update public.vehicles set status='Alugado' where id=vehicle.id;
  update private_security.rental_requests set rental_id=rental.id,transaction_ids=tx_ids where actor_id=actor and request_id=p_request_id;
  return private_security.rental_response(rental.id,tx_ids);
end $$;

create or replace function public.update_rental_atomic(p_request_id uuid,p_rental_id uuid,p_rental jsonb,p_client jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid=auth.uid();fingerprint text;request_row private_security.rental_requests;previous_row public.rentals;
  rental public.rentals;client public.clients;vehicle public.vehicles;old_vehicle_id uuid;set_sql text;response jsonb;
begin
  if not private_security.can_write_modules(array['locacao']) then raise exception using errcode='42501',message='Módulo Locações não autorizado.'; end if;
  if p_request_id is null or p_rental_id is null then raise exception using errcode='22023',message='Identificadores inválidos.'; end if;
  if p_rental is null or p_client is null or octet_length(p_rental::text)>1048576 or octet_length(p_client::text)>1048576 then raise exception using errcode='22023',message='Dados da operação inválidos.'; end if;
  fingerprint=encode(sha256(convert_to(jsonb_build_object('operation','update','id',p_rental_id,'rental',p_rental,'client',p_client)::text,'UTF8')),'hex');
  insert into private_security.rental_requests(actor_id,request_id,operation,payload_hash) values(actor,p_request_id,'update',fingerprint) on conflict do nothing;
  select * into request_row from private_security.rental_requests where actor_id=actor and request_id=p_request_id for update;
  if request_row.operation<>'update' or request_row.payload_hash<>fingerprint then raise exception using errcode='22023',message='Identificador já utilizado com outros dados.'; end if;
  if request_row.rental_id is not null then
    response=private_security.rental_response(request_row.rental_id,'{}');
    if response is null then raise exception using errcode='23505',message='Registro da operação não está mais disponível.'; end if;
    return response||jsonb_build_object('previous_vehicle',(select to_jsonb(v) from public.vehicles v where v.id=request_row.previous_vehicle_id));
  end if;
  select * into previous_row from public.rentals where id=p_rental_id for update;
  if not found then raise exception using errcode='22023',message='Locação não encontrada.'; end if;
  old_vehicle_id=coalesce(previous_row.id_veiculo,previous_row."id_do_veículo");
  rental=private_security.rental_record(p_rental,previous_row);
  if coalesce(rental.status,'Ativo') is distinct from coalesce(previous_row.status,'Ativo') then raise exception using errcode='22023',message='Use o fluxo de encerramento para alterar o estado da locação.'; end if;
  -- All affected vehicles are locked in stable order to avoid swap deadlocks.
  perform id from public.vehicles where id in (rental.id_veiculo,old_vehicle_id) order by id for update;
  select * into vehicle from public.vehicles where id=rental.id_veiculo;
  if not found then raise exception using errcode='22023',message='Veículo não encontrado.'; end if;
  if rental.id_veiculo is distinct from old_vehicle_id and exists(
    select 1 from public.rentals r where r.id<>p_rental_id and coalesce(r.id_veiculo,r."id_do_veículo")=vehicle.id
    and coalesce(r.status,'Ativo') not in ('Encerrado','Finalizado','Cancelado','Inativo')) then
    raise exception using errcode='23505',message='Veículo já possui locação ativa.';
  end if;
  client=private_security.sync_rental_client(p_client,coalesce(rental.id_cliente,previous_row.id_cliente));
  rental.id_cliente=client.id;rental.user_name=client.nome;rental.placa=vehicle.plate;rental.modelo=vehicle.model;
  select string_agg(format('%I=($1).%I',column_name,column_name),',') into set_sql from unnest(private_security.rental_columns()) column_name;
  execute format('update public.rentals set %s where id=$2 returning *',set_sql) into rental using rental,p_rental_id;
  if rental.id_veiculo is distinct from old_vehicle_id and coalesce(rental.status,'Ativo') not in ('Encerrado','Finalizado','Cancelado','Inativo') then
    update public.vehicles set status='Disponível' where id=old_vehicle_id and status='Alugado'
      and not exists(select 1 from public.rentals r where r.id<>p_rental_id and coalesce(r.id_veiculo,r."id_do_veículo")=old_vehicle_id and coalesce(r.status,'Ativo') not in ('Encerrado','Finalizado','Cancelado','Inativo'));
    update public.vehicles set status='Alugado' where id=rental.id_veiculo;
  end if;
  update private_security.rental_requests set rental_id=rental.id,previous_vehicle_id=case when old_vehicle_id<>rental.id_veiculo then old_vehicle_id else null end where actor_id=actor and request_id=p_request_id;
  return private_security.rental_response(rental.id,'{}')||jsonb_build_object('previous_vehicle',case when old_vehicle_id<>rental.id_veiculo then (select to_jsonb(v) from public.vehicles v where v.id=old_vehicle_id) else null end);
end $$;

create or replace function public.set_operational_vehicle_status(p_vehicle_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare vehicle public.vehicles;owns_fleet boolean;has_rental boolean;has_workshop boolean;
  active_rental boolean;active_replacement boolean;active_workshop boolean;resolved_status text=p_status;
begin
  if p_status is null or p_status not in ('Disponível','Em preparação','Alugado','Alugado (Reserva)','Manutenção') then
    raise exception using errcode='22023',message='Estado de veículo inválido.';
  end if;
  if not private_security.can_write_modules(array['frota','locacao','oficina','manutencaoAdmin']) then
    raise exception using errcode='42501',message='Operação de veículo não autorizada.';
  end if;
  select * into vehicle from public.vehicles where id=p_vehicle_id for update;
  if not found then raise exception using errcode='22023',message='Veículo não encontrado.'; end if;
  owns_fleet=private_security.can_write_modules(array['frota']);
  select exists(select 1 from public.rentals r where coalesce(r.id_veiculo,r."id_do_veículo")=vehicle.id
      or (coalesce(r.id_veiculo,r."id_do_veículo") is null and coalesce(nullif(r.placa,''),r.vehicle_plate)=vehicle.plate))
    or exists(select 1 from public.replacement_contracts r where vehicle.plate in (r.main_vehicle_plate,r.replacement_vehicle_plate)) into has_rental;
  select exists(select 1 from public.service_orders s where s.vehicle_id=vehicle.id or (s.vehicle_id is null and s.plate=vehicle.plate)) into has_workshop;
  if not (owns_fleet or (private_security.can_write_modules(array['locacao']) and has_rental)
    or (private_security.can_write_modules(array['oficina','manutencaoAdmin']) and has_workshop)) then
    raise exception using errcode='42501',message='Veículo sem operação associada ao módulo autorizado.';
  end if;
  if not owns_fleet then
    select exists(select 1 from public.rentals r where (coalesce(r.id_veiculo,r."id_do_veículo")=vehicle.id
      or (coalesce(r.id_veiculo,r."id_do_veículo") is null and coalesce(nullif(r.placa,''),r.vehicle_plate)=vehicle.plate))
      and coalesce(r.status,'Ativo') not in ('Encerrado','Finalizado','Cancelado','Inativo')) into active_rental;
    select exists(select 1 from public.replacement_contracts r where r.replacement_vehicle_plate=vehicle.plate and coalesce(r.status,'Ativo')='Ativo') into active_replacement;
    select exists(select 1 from public.service_orders s where (s.vehicle_id=vehicle.id or (s.vehicle_id is null and s.plate=vehicle.plate))
      and lower(coalesce(s.status,'')) not in ('concluída','concluida','concluído','concluido','encerrado','cancelada','cancelado','fechada','fechado')) into active_workshop;
    if p_status in ('Disponível','Em preparação') then
      resolved_status=case when active_workshop then 'Manutenção' when active_replacement then 'Alugado (Reserva)' when active_rental then 'Alugado' else p_status end;
    elsif (p_status='Manutenção' and not active_workshop) or (p_status='Alugado' and not active_rental)
      or (p_status='Alugado (Reserva)' and not active_replacement) then
      raise exception using errcode='22023',message='Estado incompatível com as operações ativas do veículo.';
    end if;
  end if;
  update public.vehicles set status=resolved_status where id=vehicle.id returning * into vehicle;
  return jsonb_build_object('vehicle',to_jsonb(vehicle));
end $$;

create or replace function public.pay_rental_deposit(p_request_id uuid,p_rental_id uuid,p_installment integer,p_value numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid=auth.uid();fingerprint text;request_row private_security.rental_requests;rental public.rentals;
  installments jsonb;paid numeric;
begin
  if not private_security.can_write_modules(array['caucao','faturamento']) then raise exception using errcode='42501',message='Pagamento de caução não autorizado.'; end if;
  if p_request_id is null or p_rental_id is null or p_installment is null or p_installment<1
    or p_value is null or p_value<=0 or p_value::text in ('NaN','Infinity','-Infinity') then
    raise exception using errcode='22023',message='Dados da parcela inválidos.';
  end if;
  fingerprint=encode(sha256(convert_to(jsonb_build_object('operation','deposit','id',p_rental_id,'installment',p_installment,'value',p_value)::text,'UTF8')),'hex');
  insert into private_security.rental_requests(actor_id,request_id,operation,payload_hash) values(actor,p_request_id,'deposit',fingerprint) on conflict do nothing;
  select * into request_row from private_security.rental_requests where actor_id=actor and request_id=p_request_id for update;
  if request_row.operation<>'deposit' or request_row.payload_hash<>fingerprint then raise exception using errcode='22023',message='Identificador já utilizado com outros dados.'; end if;
  select * into rental from public.rentals where id=p_rental_id for update;
  if not found then raise exception using errcode='22023',message='Locação não encontrada.'; end if;
  if request_row.rental_id is not null then return jsonb_build_object('rental',to_jsonb(rental)); end if;
  if rental.deposit_installments is null or p_installment>rental.deposit_installments then raise exception using errcode='22023',message='Parcela fora do contrato.'; end if;
  installments=coalesce(rental.documentos->'paidInstallments','[]'::jsonb);
  if jsonb_typeof(installments)<>'array' then raise exception using errcode='22023',message='Histórico de parcelas precisa de revisão.'; end if;
  -- A fresh request UUID for an already paid installment still cannot double-charge.
  if exists(select 1 from jsonb_array_elements(installments) item where item=to_jsonb(p_installment) or item=to_jsonb(p_installment::text)) then
    update private_security.rental_requests set rental_id=rental.id where actor_id=actor and request_id=p_request_id;
    return jsonb_build_object('rental',to_jsonb(rental));
  end if;
  paid=coalesce(rental."caução_paga",rental.deposit_paid,0)+p_value;
  if paid>coalesce(rental."total do depósito",rental.deposit_total,0) then raise exception using errcode='22023',message='Pagamento excede a caução do contrato.'; end if;
  update public.rentals set "caução_paga"=paid,documentos=jsonb_set(coalesce(documentos,'{}'::jsonb),'{paidInstallments}',installments||to_jsonb(p_installment))
    where id=rental.id returning * into rental;
  update private_security.rental_requests set rental_id=rental.id where actor_id=actor and request_id=p_request_id;
  return jsonb_build_object('rental',to_jsonb(rental));
end $$;

create or replace function public.save_maintenance_atomic(p_request_id uuid,p_maintenance_id uuid default null,p_maintenance jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid=auth.uid();fingerprint text;request_row private_security.rental_requests;
  previous_row public.maintenances;maintenance public.maintenances;expense public.transactions;
  prefix text;maintenance_operation_key text;matches integer;reference text;expense_responsible text;investor_name text;
begin
  if not private_security.can_write_modules(array['manutencaoAdmin','oficina']) then
    raise exception using errcode='42501',message='Manutenção não autorizada.';
  end if;
  if p_request_id is null or p_maintenance is null or jsonb_typeof(p_maintenance)<>'object' or octet_length(p_maintenance::text)>1048576
    or p_maintenance-array['vehicle_plate','vehicle_model','date','service_type','value','provider','current_km','responsible','observations','receipt_url']<>'{}'::jsonb then
    raise exception using errcode='22023',message='Campos da manutenção inválidos.';
  end if;
  fingerprint=encode(sha256(convert_to(jsonb_build_object('operation','maintenance','id',p_maintenance_id,'payload',p_maintenance)::text,'UTF8')),'hex');
  insert into private_security.rental_requests(actor_id,request_id,operation,payload_hash) values(actor,p_request_id,'maintenance',fingerprint) on conflict do nothing;
  select * into request_row from private_security.rental_requests where actor_id=actor and request_id=p_request_id for update;
  if request_row.operation<>'maintenance' or request_row.payload_hash<>fingerprint then raise exception using errcode='22023',message='Identificador já utilizado com outros dados.'; end if;
  if request_row.maintenance_id is not null then
    select * into maintenance from public.maintenances where id=request_row.maintenance_id;
    if not found then raise exception using errcode='23505',message='Registro da operação não está mais disponível.'; end if;
    select * into expense from public.transactions where id=any(request_row.transaction_ids);
    if not found then raise exception using errcode='23505',message='Despesa da operação não está mais disponível.'; end if;
    return jsonb_build_object('maintenance',to_jsonb(maintenance),'transaction',to_jsonb(expense));
  end if;
  if p_maintenance_id is not null then
    select * into previous_row from public.maintenances where id=p_maintenance_id for update;
    if not found then raise exception using errcode='22023',message='Manutenção não encontrada.'; end if;
  end if;
  maintenance=jsonb_populate_record(null::public.maintenances,coalesce(to_jsonb(previous_row),'{}'::jsonb)||p_maintenance);
  if maintenance.date is null or maintenance.value is null or maintenance.value<0 or maintenance.value::text in ('NaN','Infinity','-Infinity')
    or nullif(trim(maintenance.vehicle_plate),'') is null or length(maintenance.vehicle_plate)>30
    or nullif(trim(maintenance.service_type),'') is null or length(maintenance.service_type)>500
    or maintenance.current_km<0 or maintenance.current_km::text in ('NaN','Infinity','-Infinity') then
    raise exception using errcode='22023',message='Data, veículo, serviço ou valores da manutenção inválidos.';
  end if;
  expense_responsible=maintenance.responsible;
  if expense_responsible='Investidor' then
    select count(*),min(investor.name) into matches,investor_name from public.vehicles v
      left join public.investors investor on investor.id=v.investor_id where v.plate=maintenance.vehicle_plate;
    if matches>1 then raise exception using errcode='23505',message='Placa com mais de um veículo; revise o vínculo.'; end if;
    expense_responsible=case when nullif(investor_name,'') is not null then 'Investidor: '||investor_name else 'Investidor' end;
  end if;
  if nullif(maintenance.receipt_url,'') is not null then
    foreach reference in array string_to_array(maintenance.receipt_url,',') loop
      if not private_security.stable_rental_document_ref(trim(reference)) then raise exception using errcode='22023',message='Use referências estáveis de comprovantes autorizados.'; end if;
    end loop;
  end if;
  if previous_row.id is null then
    insert into public.maintenances(id,vehicle_plate,vehicle_model,date,service_type,value,provider,current_km,responsible,observations,receipt_url)
      values(gen_random_uuid(),maintenance.vehicle_plate,maintenance.vehicle_model,maintenance.date,maintenance.service_type,
        maintenance.value,maintenance.provider,maintenance.current_km,maintenance.responsible,maintenance.observations,maintenance.receipt_url)
      returning * into maintenance;
  else
    update public.maintenances set vehicle_plate=maintenance.vehicle_plate,vehicle_model=maintenance.vehicle_model,
      date=maintenance.date,service_type=maintenance.service_type,value=maintenance.value,provider=maintenance.provider,
      current_km=maintenance.current_km,responsible=maintenance.responsible,observations=maintenance.observations,receipt_url=maintenance.receipt_url
      where id=previous_row.id returning * into maintenance;
  end if;
  prefix='[Manutenção #'||maintenance.id||']';maintenance_operation_key='maintenance:'||maintenance.id;
  select count(*) into matches from public.transactions t where t.operation_key=maintenance_operation_key
    or (t.cat='Manutenção' and left(coalesce(t."desc",''),length(prefix))=prefix);
  if matches>1 then raise exception using errcode='23505',message='Despesa automática ambígua; revise os lançamentos.'; end if;
  if matches=1 then
    select * into expense from public.transactions t where t.operation_key=maintenance_operation_key
      or (t.cat='Manutenção' and left(coalesce(t."desc",''),length(prefix))=prefix) for update;
    update public.transactions set type='out',val=-abs(maintenance.value),cat='Manutenção',"desc"=prefix||' '||maintenance.service_type,
      date=maintenance.date,vehicle_plate=maintenance.vehicle_plate,responsible=expense_responsible,operation_key=maintenance_operation_key
      where id=expense.id returning * into expense;
  else
    insert into public.transactions(id,type,val,cat,"desc",date,vehicle_plate,responsible,status,operation_key)
      values(gen_random_uuid(),'out',-abs(maintenance.value),'Manutenção',prefix||' '||maintenance.service_type,
        maintenance.date,maintenance.vehicle_plate,expense_responsible,'Concluído',maintenance_operation_key) returning * into expense;
  end if;
  update private_security.rental_requests set maintenance_id=maintenance.id,transaction_ids=array[expense.id]
    where actor_id=actor and request_id=p_request_id;
  return jsonb_build_object('maintenance',to_jsonb(maintenance),'transaction',to_jsonb(expense));
end $$;

revoke all on function private_security.guard_billing_fine_update(),private_security.stable_rental_document_ref(text),private_security.rental_document_value_valid(jsonb,integer),private_security.rental_columns(),
  private_security.rental_record(jsonb,public.rentals),private_security.sync_rental_client(jsonb,uuid),
  private_security.rental_response(uuid,uuid[]) from public,anon,authenticated,service_role;
revoke all on function public.create_rental_atomic(uuid,jsonb,jsonb,integer),public.update_rental_atomic(uuid,uuid,jsonb,jsonb),public.pay_rental_deposit(uuid,uuid,integer,numeric),public.save_maintenance_atomic(uuid,uuid,jsonb),public.set_operational_vehicle_status(uuid,text) from public,anon,service_role;
grant execute on function public.create_rental_atomic(uuid,jsonb,jsonb,integer),public.update_rental_atomic(uuid,uuid,jsonb,jsonb),public.pay_rental_deposit(uuid,uuid,integer,numeric),public.save_maintenance_atomic(uuid,uuid,jsonb),public.set_operational_vehicle_status(uuid,text) to authenticated;
commit;
