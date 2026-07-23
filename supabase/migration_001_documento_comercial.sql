-- ============================================
-- MIGRACIÓN: Documento Comercial unificado
-- Ejecutar en Supabase > SQL Editor
-- ADVERTENCIA: esto borra los datos de prueba que tengas en
-- presupuestos / presupuesto_items / remitos / ventas.
-- Si ya cargaste presupuestos reales que querés conservar,
-- avisame antes de correr esto y hacemos una migración de datos.
-- ============================================

-- ---------- Limpieza de las tablas viejas ----------
drop table if exists presupuesto_items cascade;
drop table if exists presupuestos cascade;
drop table if exists remitos cascade;
drop table if exists ventas cascade;

-- ---------- Nuevo enum de tipo de documento ----------
create type documento_tipo as enum ('presupuesto', 'remito', 'venta');

-- ---------- DOCUMENTOS (reemplaza presupuestos + remitos + ventas) ----------
create table documentos (
  id uuid primary key default uuid_generate_v4(),
  numero serial,
  tipo documento_tipo not null,
  estado documento_estado not null default 'borrador',
  cliente_id uuid references clientes(id),
  vendedor_id uuid references perfiles(id),
  documento_origen_id uuid references documentos(id), -- de qué documento viene (remito <- presupuesto, venta <- remito)
  fecha date default current_date,
  forma_pago text,
  validez_dias integer default 7,
  observaciones text,
  descuento_porcentaje numeric(5,2) default 0,
  descuento_monto numeric(12,2) default 0,
  subtotal numeric(12,2) default 0,
  total numeric(12,2) default 0,
  costo_total numeric(12,2) default 0, -- se calcula al confirmar, para margen en ventas
  created_at timestamptz default now()
);

create index idx_documentos_tipo on documentos(tipo);
create index idx_documentos_cliente on documentos(cliente_id);
create index idx_documentos_origen on documentos(documento_origen_id);

-- ---------- ITEMS (reemplaza presupuesto_items) ----------
create table documento_items (
  id uuid primary key default uuid_generate_v4(),
  documento_id uuid references documentos(id) on delete cascade,
  producto_id uuid references productos(id),
  cantidad numeric(10,2) not null default 1,
  precio_unitario numeric(12,2) not null,
  costo_unitario numeric(12,2) default 0, -- copiado del producto al momento de la venta, para margen
  descuento_porcentaje numeric(5,2) default 0,
  descuento_monto numeric(12,2) default 0,
  subtotal numeric(12,2) not null
);

create index idx_documento_items_documento on documento_items(documento_id);

-- ============================================
-- FUNCIÓN: al confirmar un REMITO, descuenta stock automáticamente
-- ============================================
create or replace function procesar_confirmacion_documento()
returns trigger as $$
declare
  item record;
begin
  -- Solo actuar cuando pasa a 'confirmado' (y antes no lo estaba)
  if new.estado = 'confirmado' and (old is null or old.estado is distinct from 'confirmado') then

    if new.tipo = 'remito' then
      for item in select * from documento_items where documento_id = new.id loop
        insert into stock_movimientos (producto_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id, observaciones)
        values (item.producto_id, 'salida', -item.cantidad, 'remito', new.id, new.vendedor_id, 'Descuento automático por remito #' || new.numero);
      end loop;
    end if;

    -- Si este documento viene de otro (conversión), marcar el origen como 'convertido' y bloquearlo
    if new.documento_origen_id is not null then
      update documentos set estado = 'convertido' where id = new.documento_origen_id;
    end if;

  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_confirmar_documento
after insert or update on documentos
for each row execute function procesar_confirmacion_documento();

-- ============================================
-- RLS
-- ============================================
alter table documentos enable row level security;
alter table documento_items enable row level security;

create policy "usuarios autenticados acceso total" on documentos
  for all using (auth.role() = 'authenticated');
create policy "usuarios autenticados acceso total" on documento_items
  for all using (auth.role() = 'authenticated');
