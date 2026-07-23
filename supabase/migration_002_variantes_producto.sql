-- ============================================
-- MIGRACIÓN 002: Variantes de producto (por color)
-- Ejecutar en Supabase > SQL Editor, DESPUÉS de migration_001
-- Un solo archivo, pegar todo de una sola vez.
--
-- Qué hace:
--  1. Crea "producto_variantes": cada color de un producto es una fila,
--     con su propio stock. El producto padre guarda nombre/marca/precios/costo,
--     que son iguales para todos los colores.
--  2. Migra tus productos actuales: a cada uno le crea UNA variante con
--     el color y stock que ya tenía, para no perder nada.
--  3. Actualiza documento_items, stock_movimientos, compra_items e
--     inventario_items para que apunten a la variante (color) en vez
--     de al producto genérico — así el stock por color es preciso.
--  4. Actualiza los triggers de stock para que muevan el stock de la
--     variante correcta.
-- ============================================

-- ---------- 1. Tabla de variantes ----------
create table producto_variantes (
  id uuid primary key default uuid_generate_v4(),
  producto_id uuid references productos(id) on delete cascade,
  color text,
  codigo_variante text, -- código interno opcional, ej: "1005-NEGRO"
  codigo_barras text,
  foto_url text,
  stock integer default 0,
  stock_minimo integer default 0,
  stock_ideal integer default 0,
  activo boolean default true,
  created_at timestamptz default now()
);

create index idx_variantes_producto on producto_variantes(producto_id);

-- ---------- 2. Migrar datos existentes: 1 variante por producto ----------
insert into producto_variantes (producto_id, color, codigo_variante, codigo_barras, stock, stock_minimo, stock_ideal, activo)
select id, color, codigo, codigo_barras, stock, stock_minimo, stock_ideal, activo
from productos;

-- ---------- 3. Actualizar documento_items para referenciar la variante ----------
alter table documento_items add column variante_id uuid references producto_variantes(id);

update documento_items di
set variante_id = pv.id
from producto_variantes pv
where pv.producto_id = di.producto_id;

alter table documento_items drop column producto_id;
alter table documento_items alter column variante_id set not null;

-- ---------- 4. Actualizar stock_movimientos ----------
alter table stock_movimientos add column variante_id uuid references producto_variantes(id);

update stock_movimientos sm
set variante_id = pv.id
from producto_variantes pv
where pv.producto_id = sm.producto_id;

alter table stock_movimientos drop column producto_id;

-- ---------- 5. Actualizar compra_items ----------
alter table compra_items add column variante_id uuid references producto_variantes(id);

update compra_items ci
set variante_id = pv.id
from producto_variantes pv
where pv.producto_id = ci.producto_id;

alter table compra_items drop column producto_id;

-- ---------- 6. Actualizar inventario_items ----------
alter table inventario_items add column variante_id uuid references producto_variantes(id);

update inventario_items ii
set variante_id = pv.id
from producto_variantes pv
where pv.producto_id = ii.producto_id;

alter table inventario_items drop column producto_id;

-- ---------- 7. Quitar de "productos" lo que ahora vive en la variante ----------
alter table productos drop column color;
alter table productos drop column stock;
alter table productos drop column stock_minimo;
alter table productos drop column stock_ideal;
alter table productos drop column foto_url;
alter table productos drop column codigo_barras;

-- ---------- 8. Reemplazar el trigger de stock para que actualice la VARIANTE ----------
create or replace function actualizar_stock()
returns trigger as $$
begin
  update producto_variantes
  set stock = stock + new.cantidad
  where id = new.variante_id
  returning stock into new.stock_nuevo;

  return new;
end;
$$ language plpgsql;

-- ---------- 9. Reemplazar el trigger de confirmación de documento ----------
create or replace function procesar_confirmacion_documento()
returns trigger as $$
declare
  item record;
begin
  if new.estado = 'confirmado' and (old is null or old.estado is distinct from 'confirmado') then

    if new.tipo = 'remito' then
      for item in select * from documento_items where documento_id = new.id loop
        insert into stock_movimientos (variante_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id, observaciones)
        values (item.variante_id, 'salida', -item.cantidad, 'remito', new.id, new.vendedor_id, 'Descuento automático por remito #' || new.numero);
      end loop;
    end if;

    if new.documento_origen_id is not null then
      update documentos set estado = 'convertido' where id = new.documento_origen_id;
    end if;

  end if;

  return new;
end;
$$ language plpgsql;

-- ---------- 10. RLS para la tabla nueva ----------
alter table producto_variantes enable row level security;

create policy "usuarios autenticados acceso total" on producto_variantes
  for all using (auth.role() = 'authenticated');
