import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ProductosPage() {
  const supabase = createClient();
  const { data: productos } = await supabase
    .from("productos")
    .select("*")
    .eq("activo", true)
    .order("nombre");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <Link href="/productos/nuevo" className="btn-primary">
          + Nuevo producto
        </Link>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Color</th>
              <th className="px-4 py-3">Rodado</th>
              <th className="px-4 py-3 text-right">Costo</th>
              <th className="px-4 py-3 text-right">P. Mayorista</th>
              <th className="px-4 py-3 text-right">P. Minorista</th>
              <th className="px-4 py-3 text-right">Stock</th>
            </tr>
          </thead>
          <tbody>
            {productos?.map((p) => (
              <tr key={p.id} className="border-b border-neutral-50 hover:bg-neutral-50/60">
                <td className="px-4 py-3 font-mono text-xs">{p.codigo}</td>
                <td className="px-4 py-3 font-medium">{p.nombre}</td>
                <td className="px-4 py-3">{p.color ?? "—"}</td>
                <td className="px-4 py-3">{p.rodado ?? "—"}</td>
                <td className="px-4 py-3 text-right">${p.costo}</td>
                <td className="px-4 py-3 text-right">${p.precio_mayorista}</td>
                <td className="px-4 py-3 text-right">${p.precio_minorista}</td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={
                      p.stock <= p.stock_minimo
                        ? "font-semibold text-red-600"
                        : "text-neutral-700"
                    }
                  >
                    {p.stock}
                  </span>
                </td>
              </tr>
            ))}
            {(!productos || productos.length === 0) && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-neutral-400">
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
