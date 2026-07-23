import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = createClient();
  const hoy = new Date().toISOString().slice(0, 10);
  const inicioMes = new Date();
  inicioMes.setDate(1);

  const [{ data: ventasHoy }, { data: ventasMes }, { data: stockBajo }, { data: pendientes }] = await Promise.all([
    supabase.from("documentos").select("total").eq("tipo", "venta").eq("fecha", hoy),
    supabase.from("documentos").select("total").eq("tipo", "venta").gte("fecha", inicioMes.toISOString().slice(0, 10)),
    supabase.from("productos").select("id, nombre, stock, stock_minimo").lt("stock", 5).eq("activo", true),
    supabase.from("documentos").select("id").eq("tipo", "presupuesto").eq("estado", "confirmado"),
  ]);

  const totalHoy = ventasHoy?.reduce((s, v) => s + Number(v.total), 0) ?? 0;
  const totalMes = ventasMes?.reduce((s, v) => s + Number(v.total), 0) ?? 0;

  const accesos = [
    { label: "Nuevo presupuesto", href: "/presupuestos/nuevo" },
    { label: "Nueva venta", href: "/ventas/nueva" },
    { label: "Nuevo cliente", href: "/clientes/nuevo" },
    { label: "Nuevo producto", href: "/productos/nuevo" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="text-sm text-neutral-500">Ventas del día</p>
          <p className="mt-1 text-2xl font-semibold">${totalHoy.toLocaleString("es-AR")}</p>
        </div>
        <div className="card">
          <p className="text-sm text-neutral-500">Ventas del mes</p>
          <p className="mt-1 text-2xl font-semibold">${totalMes.toLocaleString("es-AR")}</p>
        </div>
        <div className="card">
          <p className="text-sm text-neutral-500">Productos con poco stock</p>
          <p className="mt-1 text-2xl font-semibold">{stockBajo?.length ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-neutral-500">Presupuestos pendientes</p>
          <p className="mt-1 text-2xl font-semibold">{pendientes?.length ?? 0}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {accesos.map((a) => (
          <Link key={a.href} href={a.href} className="btn-secondary">
            + {a.label}
          </Link>
        ))}
      </div>

      {stockBajo && stockBajo.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-medium">Alertas de stock</h2>
          <ul className="space-y-2 text-sm">
            {stockBajo.map((p) => (
              <li key={p.id} className="flex justify-between border-b border-neutral-50 pb-2">
                <span>{p.nombre}</span>
                <span className="font-medium text-red-600">{p.stock} u.</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
