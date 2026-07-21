-- ============================================
-- WIZER ERP LITE — SCHEMA COMPLETO (Supabase/Postgres)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================

create extension if not exists "uuid-ossp";

-- ---------- ENUMS ----------
create type user_role as enum ('admin', 'ventas', 'deposito', 'lectura');
create type movimiento_tipo as enum ('entrada', 'salida', 'ajuste', 'transferencia', 'venta', 'compra', 'inventario');
create type documento_estado as enum ('borrador', 'confirmado', 'convertido', 'anulado');

-- ---------- USUARIOS (extiende auth.users) ----------
create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol user_role not null default 'ventas',
  activo boolean default true,
  created_at timestamptz default now()
);

-- ---------- PROVEEDORES ----------
create table proveedores (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  contacto text,
  telefono text,
  email text,
  pais text,
  observaciones text,
  activo boolean default true,
  created_at timestamptz default now()
);

-- ---------- CATEGORÍAS Y MARCAS ----------
create table categorias (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null unique,
  subcategoria text
);

create table marcas (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null unique
);

-- ---------- LISTAS DE PRECIOS ----------
create table listas_precios (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null unique, -- Mayorista, Minorista, Distribuidor, Especial, Promo...
  created_at timestamptz default now()
);

-- ---------- PRODUCTOS ----------
create table productos (
  id uuid primary key default uuid_generate_v4(),
  codigo text unique not null,
  codigo_barras text,
  nombre text not null,
  marca_id uuid references marcas(id),
  categoria_id uuid references categorias(id),
  color text,
  talle text,
  rodado text,
  modelo text,
  proveedor_id uuid references proveedores(id),
  costo numeric(12,2) default 0,
  costo_promedio numeric(12,2) default 0,
  precio_mayorista numeric(12,2) default 0,
  precio_minorista numeric(12,2) default 0,
  precio_promocion numeric(12,2),
  stock integer default 0,
  stock_minimo integer default 0,
  stock_ideal integer default 0,
  ubicacion text,
  peso numeric(8,3),
  observaciones text,
  foto_url text,
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_productos_codigo on productos(codigo);
create index idx_productos_nombre on productos using gin (to_tsvector('spanish', nombre));

-- Precio por lista (permite listas custom por producto)
create table producto_precios (
  id uuid primary key default uuid_generate_v4(),
  producto_id uuid references productos(id) on delete cascade,
  lista_id uuid references listas_precios(id) on delete cascade,
  precio numeric(12,2) not null,
  unique(producto_id, lista_id)
);

-- ---------- CLIENTES ----------
create table clientes (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  empresa text,
  cuit text,
  telefono text,
  whatsapp text,
  email text,
  direccion text,
  provincia text,
  localidad text,
  observaciones text,
  lista_precio_id uuid references listas_precios(id),
  saldo numeric(12,2) default 0,
  activo boolean default true,
  created_at timestamptz default now()
);

create index idx_clientes_nombre on clientes using gin (to_tsvector('spanish', nombre));

-- ---------- PRESUPUESTOS ----------
create table presupuestos (
  id uuid primary key default uuid_generate_v4(),
  numero serial,
  cliente_id uuid references clientes(id),
  vendedor_id uuid references perfiles(id),
  fecha date default current_date,
  forma_pago text,
  validez_dias integer default 7,
  observaciones text,
  descuento_porcentaje numeric(5,2) default 0,
  descuento_monto numeric(12,2) default 0,
  subtotal numeric(12,2) default 0,
  total numeric(12,2) default 0,
  estado documento_estado default 'borrador',
  created_at timestamptz default now()
);

create table presupuesto_items (
  id uuid primary key default uuid_generate_v4(),
  presupuesto_id uuid references presupuestos(id) on delete cascade,
  producto_id uuid references productos(id),
  cantidad numeric(10,2) not null default 1,
  precio_unitario numeric(12,2) not null,
  descuento_porcentaje numeric(5,2) default 0,
  descuento_monto numeric(12,2) default 0,
  subtotal numeric(12,2) not null
);

-- ---------- REMITOS ----------
create table remitos (
  id uuid primary key default uuid_generate_v4(),
  numero serial,
  presupuesto_id uuid references presupuestos(id),
  cliente_id uuid references clientes(id),
  fecha date default current_date,
  observaciones text,
  estado documento_estado default 'confirmado',
  created_at timestamptz default now()
);

-- ---------- VENTAS (registro interno para stats) ----------
create table ventas (
  id uuid primary key default uuid_generate_v4(),
  presupuesto_id uuid references presupuestos(id),
  remito_id uuid references remitos(id),
  cliente_id uuid references clientes(id),
  vendedor_id uuid references perfiles(id),
  fecha date default current_date,
  total numeric(12,2) not null,
  costo_total numeric(12,2) not null,
  margen numeric(12,2) generated always as (total - costo_total) stored,
  created_at timestamptz default now()
);

-- ---------- COMPRAS ----------
create table compras (
  id uuid primary key default uuid_generate_v4(),
  numero serial,
  proveedor_id uuid references proveedores(id),
  fecha date default current_date,
  observaciones text,
  total numeric(12,2) default 0,
  estado documento_estado default 'confirmado',
  created_at timestamptz default now()
);

create table compra_items (
  id uuid primary key default uuid_generate_v4(),
  compra_id uuid references compras(id) on delete cascade,
  producto_id uuid references productos(id),
  cantidad numeric(10,2) not null,
  costo_unitario numeric(12,2) not null,
  subtotal numeric(12,2) not null
);

-- ---------- STOCK: MOVIMIENTOS (historial de todo) ----------
create table stock_movimientos (
  id uuid primary key default uuid_generate_v4(),
  producto_id uuid references productos(id),
  tipo movimiento_tipo not null,
  cantidad numeric(10,2) not null, -- positivo = entra, negativo = sale
  stock_anterior integer,
  stock_nuevo integer,
  referencia_tipo text, -- 'venta','compra','remito','inventario', etc.
  referencia_id uuid,
  usuario_id uuid references perfiles(id),
  observaciones text,
  created_at timestamptz default now()
);

create index idx_stock_mov_producto on stock_movimientos(producto_id);

-- ---------- INVENTARIO (conteo físico) ----------
create table inventarios (
  id uuid primary key default uuid_generate_v4(),
  fecha date default current_date,
  usuario_id uuid references perfiles(id),
  observaciones text,
  estado text default 'abierto', -- abierto / cerrado
  created_at timestamptz default now()
);

create table inventario_items (
  id uuid primary key default uuid_generate_v4(),
  inventario_id uuid references inventarios(id) on delete cascade,
  producto_id uuid references productos(id),
  stock_sistema integer not null,
  stock_real integer not null,
  diferencia integer generated always as (stock_real - stock_sistema) stored,
  costo_unitario numeric(12,2),
  valor_diferencia numeric(12,2) generated always as ((stock_real - stock_sistema) * costo_unitario) stored
);

-- ---------- HISTORIAL DE CAMBIOS (auditoría genérica) ----------
create table historial_cambios (
  id uuid primary key default uuid_generate_v4(),
  tabla text not null,
  registro_id uuid not null,
  usuario_id uuid references perfiles(id),
  campo text,
  valor_anterior text,
  valor_nuevo text,
  created_at timestamptz default now()
);

-- ============================================
-- FUNCIÓN: actualizar stock automáticamente al insertar movimiento
-- ============================================
create or replace function actualizar_stock()
returns trigger as $$
begin
  update productos
  set stock = stock + new.cantidad,
      updated_at = now()
  where id = new.producto_id
  returning stock into new.stock_nuevo;

  return new;
end;
$$ language plpgsql;

create trigger trg_actualizar_stock
before insert on stock_movimientos
for each row execute function actualizar_stock();

-- ============================================
-- RLS (Row Level Security) — habilitar y permitir a usuarios autenticados
-- Ajustar políticas según roles reales antes de producción
-- ============================================
alter table productos enable row level security;
alter table clientes enable row level security;
alter table presupuestos enable row level security;
alter table presupuesto_items enable row level security;
alter table remitos enable row level security;
alter table ventas enable row level security;
alter table compras enable row level security;
alter table stock_movimientos enable row level security;

create policy "usuarios autenticados acceso total" on productos
  for all using (auth.role() = 'authenticated');
create policy "usuarios autenticados acceso total" on clientes
  for all using (auth.role() = 'authenticated');
create policy "usuarios autenticados acceso total" on presupuestos
  for all using (auth.role() = 'authenticated');
create policy "usuarios autenticados acceso total" on presupuesto_items
  for all using (auth.role() = 'authenticated');
create policy "usuarios autenticados acceso total" on remitos
  for all using (auth.role() = 'authenticated');
create policy "usuarios autenticados acceso total" on ventas
  for all using (auth.role() = 'authenticated');
create policy "usuarios autenticados acceso total" on compras
  for all using (auth.role() = 'authenticated');
create policy "usuarios autenticados acceso total" on stock_movimientos
  for all using (auth.role() = 'authenticated');

-- ---------- DATOS INICIALES ----------
insert into listas_precios (nombre) values ('Mayorista'), ('Minorista'), ('Distribuidor'), ('Promoción');
insert into categorias (nombre) values ('Bicicletas'), ('Cuadros'), ('Manubrios'), ('Platos'), ('Pedales'), ('Pegs'), ('Cadenas'), ('Accesorios');
