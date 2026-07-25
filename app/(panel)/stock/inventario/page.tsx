import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function InventarioPage() {
  const supabase = createClient();

  const { data: inventarios } = await supabase
    .from("inventarios")
    .select("*, depositos(nombre)")
    .order("created_at", { ascending: false });

  const ids = (inventarios ?? []).map((i) => i.id);
  const { data: items } =
    ids.length > 0
      ? await supabase.from("inventario_items").select("inventario_id, diferencia").in("inventario_id", ids)
      : { data: [] };

  const resumenPorInventario: Record<string, { total: number; conAjuste: number }> = {};
  for (const it of items ?? []) {
    if (!resumenPorInventario[it.inventario_id]) resumenPorInventario[it.inventario_id] = { total: 0, conAjuste: 0 };
    resumenPorInventario[it.inventario_id].total++;
    if (Number(it.diferencia) !== 0) resumenPorInventario[it.inventario_id].conAjuste++;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Inventario</h1>
        <Link href="/stock/inventario/nuevo" className="btn-primary">
          + Nuevo conteo
        </Link>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Depósito</th>
              <th className="px-4 py-3">Productos contados</th>
              <th className="px-4 py-3">Con diferencia</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {inventarios?.map((inv: any) => {
              const resumen = resumenPorInventario[inv.id] ?? { total: 0, conAjuste: 0 };
              return (
                <tr key={inv.id} className="border-b border-neutral-50 hover:bg-neutral-50/60">
                  <td className="px-4 py-3">{inv.fecha}</td>
                  <td className="px-4 py-3 font-medium">{inv.depositos?.nombre ?? "—"}</td>
                  <td className="px-4 py-3">{resumen.total}</td>
                  <td className="px-4 py-3">
                    {resumen.conAjuste > 0 ? (
                      <span className="font-medium text-amber-600">{resumen.conAjuste}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        inv.estado === "cerrado" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {inv.estado}
                    </span>
                  </td>
                </tr>
              );
            })}
            {(!inventarios || inventarios.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  Todavía no hiciste ningún conteo de inventario.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
