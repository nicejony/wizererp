"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Caja {
  id: string;
  nombre: string;
  tipo: "efectivo" | "banco";
  saldo: number;
}

export default function AdministracionPanel({
  cajasConSaldo,
  movimientosIniciales,
}: {
  cajasConSaldo: Caja[];
  movimientosIniciales: any[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [nombreNueva, setNombreNueva] = useState("");
  const [tipoNueva, setTipoNueva] = useState<"efectivo" | "banco">("banco");
  const [agregandoCaja, setAgregandoCaja] = useState(false);

  const [cajaGastoId, setCajaGastoId] = useState(cajasConSaldo[0]?.id ?? "");
  const [tipoMovimiento, setTipoMovimiento] = useState<"egreso" | "ingreso">("egreso");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [guardandoGasto, setGuardandoGasto] = useState(false);

  const [historialAbierto, setHistorialAbierto] = useState<string | null>(null);

  async function crearCaja() {
    if (!nombreNueva.trim()) return;
    setAgregandoCaja(true);
    const { error } = await supabase.from("cajas").insert({ nombre: nombreNueva.trim(), tipo: tipoNueva });
    setAgregandoCaja(false);
    if (error) return alert("Error: " + error.message);
    setNombreNueva("");
    router.refresh();
  }

  async function registrarMovimiento() {
    if (!cajaGastoId || !monto || Number(monto) <= 0) return;
    setGuardandoGasto(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("movimientos_caja").insert({
      caja_id: cajaGastoId,
      tipo: tipoMovimiento,
      monto: Number(monto),
      concepto: concepto || null,
      usuario_id: user?.id ?? null,
    });

    setGuardandoGasto(false);
    if (error) {
      alert("Error al registrar: " + error.message);
      return;
    }
    setMonto("");
    setConcepto("");
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Cajas y bancos con saldo */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-500">Cajas y bancos</p>
        </div>

        <div className="space-y-2">
          {cajasConSaldo.map((c) => {
            const historial = movimientosIniciales.filter((m) => m.caja_id === c.id);
            return (
              <div key={c.id} className="border-b border-neutral-50 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {c.nombre} <span className="text-xs text-neutral-400">({c.tipo})</span>
                    </p>
                    <button
                      onClick={() => setHistorialAbierto(historialAbierto === c.id ? null : c.id)}
                      className="text-xs text-neutral-400 hover:underline"
                    >
                      {historialAbierto === c.id ? "ocultar historial" : "ver historial"}
                    </button>
                  </div>
                  <span className={`font-semibold ${c.saldo < 0 ? "text-red-600" : "text-green-600"}`}>
                    ${c.saldo.toFixed(2)}
                  </span>
                </div>

                {historialAbierto === c.id && (
                  <div className="mt-2 space-y-1 rounded-lg bg-neutral-50 p-3 text-xs">
                    {historial.length === 0 && <p className="text-neutral-400">Sin movimientos.</p>}
                    {historial.map((m) => (
                      <div key={m.id} className="flex justify-between">
                        <span className="text-neutral-500">
                          {m.fecha} — {m.concepto ?? m.referencia_tipo ?? "—"}
                        </span>
                        <span className={m.tipo === "ingreso" ? "text-green-600" : "text-red-600"}>
                          {m.tipo === "ingreso" ? "+" : "-"}${Number(m.monto).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-end gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-neutral-500">Nueva caja/banco</span>
            <input className="input" placeholder="Ej: Banco Galicia" value={nombreNueva} onChange={(e) => setNombreNueva(e.target.value)} />
          </label>
          <select className="input w-28" value={tipoNueva} onChange={(e) => setTipoNueva(e.target.value as any)}>
            <option value="banco">Banco</option>
            <option value="efectivo">Efectivo</option>
          </select>
          <button onClick={crearCaja} disabled={agregandoCaja} className="btn-secondary whitespace-nowrap">
            {agregandoCaja ? "..." : "+ Crear"}
          </button>
        </div>
      </div>

      {/* Registrar gasto / ingreso manual */}
      <div className="card space-y-4">
        <p className="text-sm font-medium text-neutral-500">Registrar gasto o ingreso</p>
        <div className="grid grid-cols-2 gap-4">
          <label>
            <span className="mb-1 block text-sm font-medium">Caja/banco</span>
            <select className="input" value={cajaGastoId} onChange={(e) => setCajaGastoId(e.target.value)}>
              {cajasConSaldo.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Tipo</span>
            <select className="input" value={tipoMovimiento} onChange={(e) => setTipoMovimiento(e.target.value as any)}>
              <option value="egreso">Gasto (egreso)</option>
              <option value="ingreso">Ingreso manual</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label>
            <span className="mb-1 block text-sm font-medium">Monto</span>
            <input type="number" className="input no-spinner" value={monto} onChange={(e) => setMonto(e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Concepto</span>
            <input className="input" placeholder="Ej: Alquiler, Luz..." value={concepto} onChange={(e) => setConcepto(e.target.value)} />
          </label>
        </div>
        <button onClick={registrarMovimiento} disabled={guardandoGasto} className="btn-primary">
          {guardandoGasto ? "Guardando..." : "Registrar"}
        </button>
      </div>
    </div>
  );
}
