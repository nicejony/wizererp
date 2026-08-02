import { createClient } from "@/lib/supabase/server";
import BotonImprimir from "@/components/BotonImprimir";
import { formatearMoneda } from "@/lib/format";


export default async function VentasPage() {
  const supabase = createClient();
  const { data: documentos } = await supabase
    .from("documentos")
    .select("*, clientes(nombre)")
    .eq("tipo", "venta")
    .order("created_at", { ascending: false });

  const totalVentas = documentos?.reduce((s, d) => s + Number(d.total), 0) ?? 0;
  const totalMargen = documentos?.reduce((s, d) => s + (Number(d.total) - Number(d.costo_total)), 0) ?? 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ventas</h1>
        <BotonImprimir />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card">
          <p className="text-sm text-neutral-500">Total vendido</p>
                    <p className="mt-1 text-2xl font-semibold">${formatearMoneda(totalVentas)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-neutral-500">Margen total</p>
                    <p className="mt-1 text-2xl font-semibold text-green-700">${formatearMoneda(totalMargen)}</p>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3">N°</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Margen</th>
            </tr>
          </thead>
          <tbody>
            {documentos?.map((d: any) => {
              const margen = Number(d.total) - Number(d.costo_total);
              return (
                <tr key={d.id} className="border-b border-neutral-50 hover:bg-neutral-50/60">
                  <td className="px-4 py-3 font-mono text-xs">
                    <a href={`/documentos/${d.id}`} className="text-violet-700 hover:underline">
                      #{d.numero}
                    </a>
                  </td>
                  <td className="px-4 py-3">{d.fecha}</td>
                  <td className="px-4 py-3 font-medium">{d.clientes?.nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">${d.total}</td>
                  <td className="px-4 py-3 text-right text-green-700">${margen.toFixed(2)}</td>
                </tr>
              );
            })}
            {(!documentos || documentos.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  No hay ventas todavía. Se generan desde un Remito.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
