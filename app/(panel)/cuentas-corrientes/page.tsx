import { createClient } from "@/lib/supabase/server";
import CuentasCorrientesPanel from "@/components/CuentasCorrientesPanel";
import BotonImprimir from "@/components/BotonImprimir";
import { calcularSaldos } from "@/lib/monedas";
import { Wallet } from "lucide-react";

export default async function CuentasCorrientesPage() {
  const supabase = createClient();

  const [{ data: movimientos }, { data: clientes }, { data: proveedores }, { data: tipoCambioData }] = await Promise.all([
    supabase.from("movimientos_cuenta").select("*").order("fecha", { ascending: false }),
    supabase.from("clientes").select("id, nombre"),
    supabase.from("proveedores").select("id, nombre").eq("activo", true),
    supabase.from("tipo_cambio").select("valor").limit(1).single(),
  ]);

  const tipoCambio = Number(tipoCambioData?.valor) || 1;
  const saldos = calcularSaldos(movimientos ?? []);

  // Se ordena por la magnitud de la deuda (los dólares se pasan a pesos solo para comparar el orden)
  function armar(lista: { id: string; nombre: string }[]) {
    return lista
      .map((e) => ({ id: e.id, nombre: e.nombre, saldoArs: saldos[e.id]?.ars ?? 0, saldoUsd: saldos[e.id]?.usd ?? 0 }))
      .sort(
        (a, b) =>
          Math.abs(b.saldoArs) + Math.abs(b.saldoUsd) * tipoCambio - (Math.abs(a.saldoArs) + Math.abs(a.saldoUsd) * tipoCambio)
      );
  }

  const clientesConSaldo = armar(clientes ?? []);
  const proveedoresConSaldo = armar(proveedores ?? []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Wallet className="text-violet-600" size={22} /> Cuentas Corrientes
        </h1>
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
