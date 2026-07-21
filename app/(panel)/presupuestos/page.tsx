import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function PresupuestosPage() {
  const supabase = createClient();
  const { data: presupuestos } = await supabase
    .from("presupuestos")
    .select("*, clientes(nombre)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Presupuestos</h1>
        <Link href="/presupuestos/nuevo" className="btn-primary">
          + Nuevo presupuesto
        </Link>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3">N°</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {presupuestos?.map((p: any) => (
              <tr key={p.id} className="border-b border-neutral-50 hover:bg-neutral-50/60">
                <td className="px-4 py-3 font-mono text-xs">#{p.numero}</td>
                <td className="px-4 py-3">{p.fecha}</td>
                <td className="px-4 py-3 font-medium">{p.clientes?.nombre ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">
                    {p.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium">${p.total}</td>
              </tr>
            ))}
            {(!presupuestos || presupuestos.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  No hay presupuestos todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
