import { createClient } from "@/lib/supabase/server";
import CuentasCorrientesPanel from "@/components/CuentasCorrientesPanel";
import BotonImprimir from "@/components/BotonImprimir";

export default async function CuentasCorrientesPage() {
  const supabase = createClient();

  const [{ data: movimientos }, { data: clientes }, { data: proveedores }] = await Promise.all([
    supabase.from("movimientos_cuenta").select("*").order("fecha", { ascending: false }),
    supabase.from("clientes").select("id, nombre"),
    supabase.from("proveedores").select("id, nombre").eq("activo", true),
  ]);

  const saldos: Record<string, number> = {};
  for (const m of movimientos ?? []) {
    const signo = m.tipo === "cargo" ? 1 : -1;
    saldos[m.entidad_id] = (saldos[m.entidad_id] ?? 0) + signo * Number(m.monto);
  }

  const clientesConSaldo = (clientes ?? [])
    .map((c) => ({ id: c.id, nombre: c.nombre, saldo: saldos[c.id] ?? 0 }))
    .sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));

  const proveedoresConSaldo = (proveedores ?? [])
    .map((p) => ({ id: p.id, nombre: p.nombre, saldo: saldos[p.id] ?? 0 }))
    .sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cuentas Corrientes</h1>
        <BotonImprimir />
      </div>
      <CuentasCorrientesPanel
        clientesConSaldo={clientesConSaldo}
        proveedoresConSaldo={proveedoresConSaldo}
        movimientosIniciales={movimientos ?? []}
      />
    </div>
  );
}

