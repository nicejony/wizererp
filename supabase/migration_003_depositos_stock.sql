-- ============================================
-- MIGRACIÓN 003: Depósitos y stock por depósito
-- Ejecutar en Supabase > SQL Editor, DESPUÉS de migration_002
-- Un solo archivo, pegar todo de una sola vez.
--
-- Qué hace:
--  1. Crea "depositos" con un depósito "Principal" ya cargado.
--  2. Crea "variante_stock": el stock deja de ser un número único
--     por color, y pasa a ser un número por color Y por depósito.
--     Todo tu stock actual se migra automáticamente al depósito Principal.
--  3. stock_minimo / stock_ideal quedan en producto_variantes (son un
--     umbral general del color, no de un depósito en particular).
--  4. Los remitos siguen descontando del depósito Principal automáticamente.
--  5. Agrega una función para registrar Transferencias entre depósitos.
-- ============================================

-- ---------- 1. Depósitos ----------
create table depositos (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null unique,
  tipo text not null default 'secundario' check (tipo in ('principal', 'secundario')),
  direccion text,
  activo boolean default true,
  created_at timestamptz default now()
);

insert into depositos (nombre, tipo) values ('Principal', 'principal');

-- ---------- 2. Stock por variante y depósito ----------
create table variante_stock (
  id uuid primary key default uuid_generate_v4(),
  variante_id uuid references producto_variantes(id) on delete cascade,
  deposito_id uuid references depositos(id),
  stock integer default 0,
  unique (variante_id, deposito_id)
);

create index idx_variante_stock_variante on variante_stock(variante_id);
create index idx_variante_stock_deposito on variante_stock(deposito_id);

-- Migrar el stock actual de cada variante al depósito Principal
insert into variante_stock (variante_id, deposito_id, stock)
select pv.id, (select id from depositos where tipo = 'principal'), pv.stock
from producto_variantes pv;

alter table producto_variantes drop column stock;

-- ---------- 3. stock_movimientos ahora sabe de qué depósito es ----------
alter table stock_movimientos add column deposito_id uuid references depositos(id);

update stock_movimientos
set deposito_id = (select id from depositos where tipo = 'principal')
where deposito_id is null;

-- Si en el futuro se inserta un movimiento sin especificar depósito, usar Principal
create or replace function default_deposito_principal()
returns trigger as $$
begin
  if new.deposito_id is null then
    new.deposito_id := (select id from depositos where tipo = 'principal' limit 1);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_default_deposito
before insert on stock_movimientos
for each row execute function default_deposito_principal();

-- ---------- 4. Trigger de stock: ahora actualiza variante_stock (por depósito) ----------
create or replace function actualizar_stock()
returns trigger as $$
begin
  insert into variante_stock (variante_id, deposito_id, stock)
  values (new.variante_id, new.deposito_id, new.cantidad)
  on conflict (variante_id, deposito_id)
  do update set stock = variante_stock.stock + excluded.stock;

  return new;
end;
$$ language plpgsql;

-- ---------- 5. Trigger de confirmación de documento: remito descuenta del Principal ----------
create or replace function procesar_confirmacion_documento()
returns trigger as $$
declare
  item record;
  deposito_principal_id uuid;
begin
  if new.estado = 'confirmado' and (old is null or old.estado is distinct from 'confirmado') then

    if new.tipo = 'remito' then
      select id into deposito_principal_id from depositos where tipo = 'principal' limit 1;

      for item in select * from documento_items where documento_id = new.id loop
        insert into stock_movimientos (variante_id, deposito_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id, observaciones)
        values (item.variante_id, deposito_principal_id, 'salida', -item.cantidad, 'remito', new.id, new.vendedor_id, 'Descuento automático por remito #' || new.numero);
      end loop;
    end if;

    if new.documento_origen_id is not null then
      update documentos set estado = 'convertido' where id = new.documento_origen_id;
    end if;

  end if;

  return new;
end;
$$ language plpgsql;

-- ---------- 6. Función para registrar una Transferencia entre depósitos ----------
create or replace function transferir_stock(
  p_variante_id uuid,
  p_deposito_origen_id uuid,
  p_deposito_destino_id uuid,
  p_cantidad numeric,
  p_usuario_id uuid,
  p_observaciones text default null
)
returns void as $$
declare
  v_referencia_id uuid := uuid_generate_v4();
begin
  insert into stock_movimientos (variante_id, deposito_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id, observaciones)
  values (p_variante_id, p_deposito_origen_id, 'transferencia', -p_cantidad, 'transferencia', v_referencia_id, p_usuario_id, p_observaciones);

  insert into stock_movimientos (variante_id, deposito_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id, observaciones)
  values (p_variante_id, p_deposito_destino_id, 'transferencia', p_cantidad, 'transferencia', v_referencia_id, p_usuario_id, p_observaciones);
end;
$$ language plpgsql;

-- ---------- 7. Vista de resumen: stock total de cada color (todos los depósitos sumados) ----------
create view variante_resumen as
select
  pv.id as variante_id,
  pv.producto_id,
  pv.color,
  pv.stock_minimo,
  pv.stock_ideal,
  pv.activo,
  coalesce(sum(vs.stock), 0) as stock_total
from producto_variantes pv
left join variante_stock vs on vs.variante_id = pv.id
group by pv.id;

-- ---------- 8. RLS ----------
alter table depositos enable row level security;
alter table variante_stock enable row level security;

create policy "usuarios autenticados acceso total" on depositos
  for all using (auth.role() = 'authenticated');
create policy "usuarios autenticados acceso total" on variante_stock
  for all using (auth.role() = 'authenticated');
