import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import BotonImprimir from "@/components/BotonImprimir";

export default async function FichaCuentaCorrientePage({ params }: { params: { tipo: string; id: string } }) {
  const supabase = createClient();
  const { tipo, id } = params;

  if (tipo !== "cliente" && tipo !== "proveedor") notFound();

  const tabla = tipo === "cliente" ? "clientes" : "proveedores";
  const { data: entidad } = await supabase.from(tabla).select("nombre").eq("id", id).single();
  if (!entidad) notFound();

  const { data: movimientos } = await supabase
    .from("movimientos_cuenta")
    .select("*")
    .eq("entidad_tipo", tipo)
    .eq("entidad_id", id)
    .order("fecha", { ascending: true })
    .order("created_at", { ascending: true });

  let saldoCorrido = 0;
  const filas = (movimientos ?? []).map((m) => {
    saldoCorrido += m.tipo === "cargo" ? Number(m.monto) : -Number(m.monto);
    return { ...m, saldoCorrido };
  });

  return (
    <div className="max-w-2xl">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href="/cuentas-corrientes" className="text-xs text-neutral-400 hover:underline">
          ← Volver a Cuentas Corrientes
        </Link>
        <BotonImprimir />
      </div>

      <div className="card">
        <div className="mb-6 border-b border-neutral-100 pb-4">
          <p className="text-xl font-bold text-violet-700">WIZER BIKES</p>
          <p className="text-sm text-neutral-500">
            Cuenta corriente — {tipo === "cliente" ? "Cliente" : "Proveedor"}: <span className="font-medium text-neutral-700">{entidad.nombre}</span>
          </p>
        </div>

        <table className="mb-4 w-full text-sm">
          <thead className="border-b border-neutral-100 text-left text-neutral-500">
            <tr>
              <th className="py-2">Fecha</th>
              <th className="py-2">Concepto</th>
              <th className="py-2 text-right">Cargo</th>
              <th className="py-2 text-right">Pago</th>
              <th className="py-2 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((m) => (
              <tr key={m.id} className="border-b border-neutral-50">
                <td className="py-2">{m.fecha}</td>
                <td className="py-2">{m.observaciones ?? m.referencia_tipo ?? "—"}</td>
                <td className="py-2 text-right text-red-600">{m.tipo === "cargo" ? `$${Number(m.monto).toFixed(2)}` : ""}</td>
                <td className="py-2 text-right text-green-600">{m.tipo === "pago" ? `$${Number(m.monto).toFixed(2)}` : ""}</td>
                <td className="py-2 text-right font-medium">${m.saldoCorrido.toFixed(2)}</td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-neutral-400">
                  Sin movimientos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex justify-end border-t border-neutral-100 pt-4">
          <div className="text-right">
            <p className="text-sm text-neutral-500">Saldo actual</p>
            <p className={`text-2xl font-semibold ${saldoCorrido > 0 ? "text-red-600" : saldoCorrido < 0 ? "text-green-600" : "text-neutral-400"}`}>
              ${Math.abs(saldoCorrido).toFixed(2)} {saldoCorrido !== 0 && (saldoCorrido > 0 ? "(debe)" : "(a favor)")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
