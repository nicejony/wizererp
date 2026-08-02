import { createClient } from "@/lib/supabase/server";
import DocumentoAcciones from "@/components/DocumentoAcciones";
import BotonImprimir from "@/components/BotonImprimir";
import { formatearMoneda } from "@/lib/format";

export default async function RemitosPage() {
  const supabase = createClient();
  const { data: documentos } = await supabase
    .from("documentos")
    .select("*, clientes(nombre)")
    .eq("tipo", "remito")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Remitos</h1>
        <BotonImprimir />
      </div>
      <p className="mb-4 text-sm text-neutral-500 no-print">
        Los remitos se generan convirtiendo un presupuesto confirmado. Al confirmarse descuentan stock automáticamente.
      </p>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3">N°</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right no-print">Acción</th>
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
                <td className="px-4 py-3">
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                    {d.estado}
                  </span>
                </td>
                                <td className="px-4 py-3 text-right font-medium">${formatearMoneda(d.total)}</td>
                <td className="px-4 py-3 text-right no-print">
                  <DocumentoAcciones documentoId={d.id} tipo="remito" estado={d.estado} />
                </td>
              </tr>
            ))}
            {(!documentos || documentos.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  No hay remitos todavía. Se generan desde un Presupuesto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
