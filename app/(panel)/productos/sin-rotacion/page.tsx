import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SinRotacionPage() {
  const supabase = createClient();

  const { data: stockResumen } = await supabase
    .from("variante_resumen")
    .select("producto_id")
    .eq("activo", true)
    .gt("stock_total", 0);

  const idsConStock = [...new Set((stockResumen ?? []).map((v: any) => v.producto_id))];

  const { data: productos } =
    idsConStock.length > 0 ? await supabase.from("productos").select("id, nombre, codigo").in("id", idsConStock) : { data: [] };

  const { data: itemsVenta } = await supabase
    .from("documento_items")
    .select("documentos!inner(tipo, fecha), producto_variantes(producto_id)")
    .eq("documentos.tipo", "venta");

  const ultimaVentaPorProducto: Record<string, string> = {};
  for (const item of (itemsVenta ?? []) as any[]) {
    const productoId = item.producto_variantes?.producto_id;
    const fecha = item.documentos?.fecha;
    if (!productoId || !fecha) continue;
    if (!ultimaVentaPorProducto[productoId] || fecha > ultimaVentaPorProducto[productoId]) {
      ultimaVentaPorProducto[productoId] = fecha;
    }
  }

  const hoy = new Date();
  const sinRotacion = (productos ?? [])
    .map((p) => {
      const ultimaVenta = ultimaVentaPorProducto[p.id];
      const dias = ultimaVenta ? Math.floor((hoy.getTime() - new Date(ultimaVenta).getTime()) / 86400000) : null;
      return { id: p.id, nombre: p.nombre, codigo: p.codigo, dias };
    })
    .filter((p) => p.dias === null || p.dias > 30)
    .sort((a, b) => (b.dias ?? 999999) - (a.dias ?? 999999));

  return (
    <div>
      <Link href="/dashboard" className="text-xs text-neutral-400 hover:underline">
        ← Volver al Dashboard
      </Link>
      <h1 className="mb-2 mt-1 text-2xl font-semibold">Productos sin rotación</h1>
      <p className="mb-6 text-sm text-neutral-500">Productos con stock que nunca se vendieron o no se venden hace más de 30 días.</p>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {sinRotacion.map((p) => (
              <tr key={p.id} className="border-b border-neutral-50 hover:bg-neutral-50/60">
                <td className="px-4 py-3 font-mono text-xs">{p.codigo}</td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/productos/${p.id}`} className="text-violet-700 hover:underline">
                    {p.nombre}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {p.dias === null ? (
                    <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-600">Nunca vendido</span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                      Última venta hace {p.dias} días
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {sinRotacion.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">
                  Todos los productos con stock tuvieron ventas recientes. 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
