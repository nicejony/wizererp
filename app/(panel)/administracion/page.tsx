import { createClient } from "@/lib/supabase/server";
import AdministracionPanel from "@/components/AdministracionPanel";
import { Landmark } from "lucide-react";


export default async function AdministracionPage() {
  const supabase = createClient();

  const [{ data: cajas }, { data: movimientos }] = await Promise.all([
    supabase.from("cajas").select("*").eq("activo", true).order("tipo"),
    supabase.from("movimientos_caja").select("*").order("fecha", { ascending: false }),
  ]);

  const saldos: Record<string, number> = {};
  for (const c of cajas ?? []) saldos[c.id] = Number(c.saldo_inicial);
  for (const m of movimientos ?? []) {
    const signo = m.tipo === "ingreso" ? 1 : -1;
    saldos[m.caja_id] = (saldos[m.caja_id] ?? 0) + signo * Number(m.monto);
  }

  const cajasConSaldo = (cajas ?? []).map((c) => ({ ...c, saldo: saldos[c.id] ?? 0 }));

  return (
    <div>
            <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold">
        <Landmark className="text-violet-600" size={22} /> Administración
      </h1>
      <AdministracionPanel cajasConSaldo={cajasConSaldo} movimientosIniciales={movimientos ?? []} />
    </div>
  );
}
