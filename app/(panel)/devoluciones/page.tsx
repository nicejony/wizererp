import { createClient } from "@/lib/supabase/server";
import BotonImprimir from "@/components/BotonImprimir";
import { formatearMoneda } from "@/lib/format";

export default async function DevolucionesPage() {
  const supabase = createClient();
  const { data: documentos } = await supabase
    .from("documentos")
    .select("*, clientes(nombre)")
    .eq("tipo", "nota_credito")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Devoluciones</h1>
        <BotonImprimir />
      </div>
      <p className="mb-4 text-sm text-neutral-500 no-print">
        Se generan desde una Venta, con el botón "Generar devolución".
      </p>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3">N°</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3 text-right">Total devuelto</th>
            </tr>
          </thead>
          <tbody>
            {documentos?.map((d: any) => (
              <tr key={d.id} className="border-b border-neutral-50 hover:bg-neutral-50/60">
                <td className="px-4 py-3 font-mono text-xs">
                  <a href={`/documentos/${d.id}`} className="text-violet-700 hover:underline">
                    #{d.numero}
                  </a>
                </td>
                <td className="px-4 py-3">{d.fecha}</td>
                <td className="px-4 py-3 font-medium">{d.clientes?.nombre ?? "—"}</td>
                                <td className="px-4 py-3 text-right font-medium text-red-600">-${formatearMoneda(d.total)}</td>
              </tr>
            ))}
            {(!documentos || documentos.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                  No hay devoluciones todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
