import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { calcularSaldos, conMoneda } from "@/lib/monedas";
import { Users } from "lucide-react";

export default async function ClientesPage() {
  const supabase = createClient();
  const [{ data: clientes }, { data: movimientos }] = await Promise.all([
    supabase.from("clientes").select("*").eq("activo", true).order("nombre"),
    supabase.from("movimientos_cuenta").select("entidad_id, tipo, monto, moneda").eq("entidad_tipo", "cliente"),
  ]);

  // El saldo se calcula siempre desde los movimientos de cuenta corriente, separado por moneda
  const saldos = calcularSaldos(movimientos ?? []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Users className="text-violet-600" size={22} /> Clientes
        </h1>
        <Link href="/clientes/nuevo" className="btn-primary">
          + Nuevo cliente
        </Link>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Teléfono / WhatsApp</th>
              <th className="px-4 py-3">Localidad</th>
              <th className="px-4 py-3 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {clientes?.map((c) => {
              const s = saldos[c.id] ?? { ars: 0, usd: 0 };
              const sinSaldo = s.ars === 0 && s.usd === 0;
              return (
                <tr key={c.id} className="border-b border-neutral-50 hover:bg-neutral-50/60">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/clientes/${c.id}`} className="text-violet-700 hover:underline">
                      {c.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.empresa ?? "—"}</td>
                  <td className="px-4 py-3">{c.whatsapp ?? c.telefono ?? "—"}</td>
                  <td className="px-4 py-3">{c.localidad ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {sinSaldo ? (
                      conMoneda(0, "ARS")
                    ) : (
                      <>
                        {s.ars !== 0 && <p className={s.ars > 0 ? "text-red-600" : "text-green-600"}>{conMoneda(s.ars, "ARS")}</p>}
                        {s.usd !== 0 && <p className={s.usd > 0 ? "text-red-600" : "text-green-600"}>{conMoneda(s.usd, "USD")}</p>}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {(!clientes || clientes.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  No hay clientes cargados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
