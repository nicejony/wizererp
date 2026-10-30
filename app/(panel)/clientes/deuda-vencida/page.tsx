import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { conMoneda, normalizarMoneda, Moneda } from "@/lib/monedas";

export default async function DeudaVencidaPage() {
  const supabase = createClient();

  const [{ data: movimientos }, { data: clientes }] = await Promise.all([
    supabase.from("movimientos_cuenta").select("*").eq("entidad_tipo", "cliente"),
    supabase.from("clientes").select("id, nombre"),
  ]);

  // Cada moneda se evalúa por separado: saldo y cargo más viejo de esa moneda
  const saldos: Record<string, number> = {};
  const cargoMasViejo: Record<string, string> = {};

  for (const m of movimientos ?? []) {
    const clave = `${m.entidad_id}|${normalizarMoneda(m.moneda)}`;
    const signo = m.tipo === "cargo" ? 1 : -1;
    saldos[clave] = (saldos[clave] ?? 0) + signo * Number(m.monto);
    if (m.tipo === "cargo") {
      if (!cargoMasViejo[clave] || m.fecha < cargoMasViejo[clave]) {
        cargoMasViejo[clave] = m.fecha;
      }
    }
  }

  const hoy = new Date();
  const conDeudaVencida: { id: string; nombre: string; moneda: Moneda; saldo: number; diasAtraso: number }[] = [];

  for (const c of clientes ?? []) {
    for (const moneda of ["ARS", "USD"] as Moneda[]) {
      const clave = `${c.id}|${moneda}`;
      const saldo = Math.round((saldos[clave] ?? 0) * 100) / 100;
      const fechaCargo = cargoMasViejo[clave];
      const diasAtraso = fechaCargo ? Math.floor((hoy.getTime() - new Date(fechaCargo).getTime()) / 86400000) : 0;
      if (saldo > 0 && diasAtraso > 30) {
        conDeudaVencida.push({ id: c.id, nombre: c.nombre, moneda, saldo, diasAtraso });
      }
    }
  }
  conDeudaVencida.sort((a, b) => b.diasAtraso - a.diasAtraso);

  return (
    <div>
      <Link href="/dashboard" className="text-xs text-neutral-400 hover:underline">
        ← Volver al Dashboard
      </Link>
      <h1 className="mb-2 mt-1 text-2xl font-semibold">Clientes con deuda vencida</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Clientes con saldo pendiente cuya deuda más antigua tiene más de 30 días. Cada moneda se evalúa por separado.
      </p>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3 text-right">Días de atraso</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {conDeudaVencida.map((c) => (
              <tr key={`${c.id}-${c.moneda}`} className="border-b border-neutral-50 hover:bg-neutral-50/60">
                <td className="px-4 py-3 font-medium">{c.nombre}</td>
                <td className="px-4 py-3 text-right text-red-600">{conMoneda(c.saldo, c.moneda)}</td>
                <td className="px-4 py-3 text-right">{c.diasAtraso} días</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/cuentas-corrientes/cliente/${c.id}`} className="text-xs text-violet-600 hover:underline">
                    ver ficha
                  </Link>
                </td>
              </tr>
            ))}
            {conDeudaVencida.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                  No hay clientes con deuda vencida. 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
