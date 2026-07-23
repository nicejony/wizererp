# Wizer ERP Lite

Sistema de gestión comercial para Wizer Bikes. Next.js + Supabase.

## Módulos incluidos en este scaffold
- Login (Supabase Auth)
- Dashboard (ventas del día/mes, alertas de stock)
- Productos (listado + alta)
- Clientes (listado + alta)
- Presupuestos (buscador de cliente/producto, cálculo automático, guardado)

El resto de los módulos del PRD (Remitos, Compras, Stock, Reportes, etc.) siguen el mismo patrón: una carpeta en `app/(panel)/` con `page.tsx` (listado) y `nuevo/page.tsx` (alta), consultando las tablas ya creadas en `supabase/schema.sql`.

## Migración: Documento Comercial unificado
Si ya tenías el schema original corrido en Supabase, ejecutá **una sola vez** `supabase/migration_001_documento_comercial.sql` en el SQL Editor. Esto reemplaza las tablas `presupuestos`, `presupuesto_items`, `remitos` y `ventas` por dos tablas nuevas: `documentos` (con campo `tipo`: presupuesto/remito/venta) y `documento_items`.

⚠️ Esta migración borra los datos de prueba que tengas en esas tablas viejas. Si tenías presupuestos reales cargados que no querés perder, avisá antes de correrla para migrar los datos en vez de borrarlos.

Con esto, el flujo queda:
1. Creás un **Presupuesto** (`/presupuestos/nuevo`)
2. Desde el listado de Presupuestos, botón **"Convertir a Remito"** → descuenta stock automáticamente y bloquea el presupuesto original
3. Desde el listado de Remitos, botón **"Convertir a Venta"** → queda registrada para estadísticas y margen, y bloquea el remito original

## 1. Crear el proyecto en Supabase
1. Entrá a https://supabase.com → **New project**.
2. Cuando esté listo, andá a **SQL Editor** → **New query**.
3. Copiá todo el contenido de `supabase/schema.sql` y ejecutalo (▶ Run).
   Esto crea todas las tablas, relaciones, triggers de stock y políticas de seguridad.
4. Si es un proyecto nuevo, corré también `supabase/migration_001_documento_comercial.sql` a continuación (ver sección de Migración más abajo) — reemplaza presupuestos/remitos/ventas por el modelo unificado de Documentos.
5. Andá a **Project Settings → API** y copiá:
   - `Project URL`
   - `anon public key`

## 2. Crear tu primer usuario
1. En Supabase: **Authentication → Users → Add user**.
2. Cargá tu email y una contraseña. Con eso ya podés loguearte en el sistema.

## 3. Configurar el proyecto local
```bash
git clone <tu-repo>
cd wizer-erp
cp .env.example .env.local
```
Editá `.env.local` y pegá tu `Project URL` y `anon key`.

```bash
npm install
npm run dev
```
Abrí http://localhost:3000 → te va a pedir login.

## 4. Subir a GitHub
```bash
git init
git add .
git commit -m "Wizer ERP Lite - versión inicial"
git branch -M main
git remote add origin https://github.com/tu-usuario/wizer-erp.git
git push -u origin main
```

## 5. Deploy en Vercel
1. Entrá a https://vercel.com → **Add New Project** → importá el repo de GitHub.
2. En **Environment Variables** cargá las mismas dos variables de `.env.local`.
3. Deploy. Listo, queda con URL pública y se actualiza solo con cada `git push`.

## Cómo seguir construyendo (con Claude Code, Cursor, etc.)
Este scaffold ya tiene la base (auth, schema, diseño, patrón de CRUD). Para pedirle a una IA que agregue un módulo nuevo, indicale:
- Qué tabla de `supabase/schema.sql` va a usar
- Que siga el mismo patrón de `app/(panel)/productos/` y `app/(panel)/presupuestos/nuevo/`
- Ejemplo de prompt: *"Agregá el módulo de Remitos siguiendo el mismo patrón que Presupuestos, usando la tabla `remitos` del schema."*
