import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import BotonImprimir from "@/components/BotonImprimir";
import { formatearMoneda } from "@/lib/format";

export default async function ProductosPage() {
  const supabase = createClient();
  const { data: variantes } = await supabase
    .from("variante_resumen")
    .select("*, productos(codigo, nombre, costo, precio_mayorista, precio_minorista)")
    .eq("activo", true)
    .order("producto_id");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <div className="flex gap-2">
          <BotonImprimir />
          <Link href="/productos/nuevo" className="btn-primary no-print">
            + Nuevo producto
          </Link>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Color</th>
              <th className="px-4 py-3 text-right">Costo</th>
              <th className="px-4 py-3 text-right">P. Mayorista</th>
              <th className="px-4 py-3 text-right">P. Minorista</th>
              <th className="px-4 py-3 text-right">Stock</th>
            </tr>
          </thead>
          <tbody>
            {variantes?.map((v: any) => (
              <tr key={v.variante_id} className="border-b border-neutral-50 hover:bg-neutral-50/60">
                <td className="px-4 py-3 font-mono text-xs">{v.productos?.codigo}</td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/productos/${v.producto_id}`} className="text-violet-700 hover:underline">
                    {v.productos?.nombre}
                  </Link>
                </td>
                <td className="px-4 py-3">{v.color ?? "—"}</td>
                <td className="px-4 py-3 text-right">${v.productos?.costo}</td>
                <td className="px-4 py-3 text-right">${v.productos?.precio_mayorista}</td>
                <td className="px-4 py-3 text-right">${v.productos?.precio_minorista}</td>
                <td className="px-4 py-3 text-right">
                  <span className={v.stock_total <= v.stock_minimo ? "font-semibold text-red-600" : "text-neutral-700"}>
                    {v.stock_total}
                  </span>
                </td>
              </tr>
            ))}
            {(!variantes || variantes.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  No hay productos cargados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
