import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import BotonImprimir from "@/components/BotonImprimir";
import { formatearMoneda } from "@/lib/format";
import { Package } from "lucide-react";

export default async function ProductosPage() {
  const supabase = createClient();
  const { data: variantes } = await supabase
    .from("variante_resumen")
    .select(
      "*, productos(codigo, nombre, costo, moneda_costo, precio_mayorista, precio_minorista, moneda_venta, foto_url, categorias(nombre))"
    )
    .eq("activo", true)
    .order("producto_id");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Package className="text-violet-600" size={22} /> Productos
        </h1>
                <div className="flex gap-2">
          <BotonImprimir />
          <Link href="/productos/listas-precios" className="btn-secondary no-print">
            📋 Listas de Precios
          </Link>
          <Link href="/productos/importar" className="btn-secondary no-print">
            📤 Importar Excel
          </Link>
          <Link href="/productos/nuevo" className="btn-primary no-print">
            + Nuevo producto
          </Link>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3">Foto</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Rubro</th>
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
                <td className="px-4 py-3">
                  {v.productos?.foto_url ? (
                    <img src={v.productos.foto_url} alt="" className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <span title="Sin foto" className="text-neutral-300">
                      ⚠️
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{v.productos?.codigo}</td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/productos/${v.producto_id}`} className="text-violet-700 hover:underline">
                    {v.productos?.nombre}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-500">{v.productos?.categorias?.nombre ?? "—"}</td>
                <td className="px-4 py-3">{v.color ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  ${formatearMoneda(v.productos?.costo ?? 0)}
                  {v.productos?.moneda_costo === "USD" && <span className="ml-1 text-xs text-neutral-400">USD</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  ${formatearMoneda(v.productos?.precio_mayorista ?? 0)}
                  {v.productos?.moneda_venta === "USD" && <span className="ml-1 text-xs text-neutral-400">USD</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  ${formatearMoneda(v.productos?.precio_minorista ?? 0)}
                  {v.productos?.moneda_venta === "USD" && <span className="ml-1 text-xs text-neutral-400">USD</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={v.stock_total <= v.stock_minimo ? "font-semibold text-red-600" : "text-neutral-700"}>
                    {v.stock_total}
                  </span>
                </td>
              </tr>
            ))}
            {(!variantes || variantes.length === 0) && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-neutral-400">
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


