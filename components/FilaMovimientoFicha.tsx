"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatearMoneda } from "@/lib/format";

export default function FilaMovimientoFicha({ m, saldoCorrido }: { m: any; saldoCorrido: number }) {
  const router = useRouter();
  const supabase = createClient();
  const esManual = !m.referencia_tipo;

  const [editando, setEditando] = useState(false);
  const [monto, setMonto] = useState(String(m.monto));
  const [fecha, setFecha] = useState(String(m.fecha ?? "").slice(0, 10));
  const [observaciones, setObservaciones] = useState(m.observaciones ?? "");
  const [guardando, setGuardando] = useState(false);

  function empezarEdicion() {
    setMonto(String(m.monto));
    setFecha(String(m.fecha ?? "").slice(0, 10));
    setObservaciones(m.observaciones ?? "");
    setEditando(true);
  }

  async function guardar() {
    if (esManual && (!monto || Number(monto) <= 0)) {
      alert("El monto tiene que ser mayor a 0.");
      return;
    }
    setGuardando(true);
    const cambios: any = { observaciones: observaciones || null };
    if (esManual) {
      cambios.monto = Number(monto);
      if (fecha) cambios.fecha = fecha;
    }
    const { error } = await supabase.from("movimientos_cuenta").update(cambios).eq("id", m.id);
    setGuardando(false);
    if (error) {
      alert("Error al guardar: " + error.message);
      return;
    }
    setEditando(false);
    router.refresh();
  }

  async function eliminar() {
    if (!confirm("¿Eliminar este movimiento? El saldo se va a recalcular. No se puede deshacer.")) return;
    setGuardando(true);
    const { error } = await supabase.from("movimientos_cuenta").delete().eq("id", m.id);
    setGuardando(false);
    if (error) {
      alert("Error al eliminar: " + error.message);
      return;
    }
    router.refresh();
  }

  if (editando) {
    return (
      <tr className="no-print border-b border-neutral-50 bg-violet-50/40">
        <td colSpan={6} className="py-3">
          <div className="space-y-2 text-xs">
            {esManual ? (
              <div className="flex gap-2">
                <label className="flex-1">
                  <span className="mb-1 block text-neutral-500">Fecha</span>
                  <input type="date" className="input py-1" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </label>
                <label className="flex-1">
                  <span className="mb-1 block text-neutral-500">Monto</span>
                  <input type="number" className="input no-spinner py-1" value={monto} onChange={(e) => setMonto(e.target.value)} />
                </label>
              </div>
            ) : (
              <p className="text-neutral-400">
                Movimiento automático: solo se puede editar la descripción. Para cambiar el monto, revertí el documento de origen.
              </p>
            )}
            <label className="block">
              <span className="mb-1 block text-neutral-500">Descripción</span>
              <input className="input py-1" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </label>
            <div className="flex items-center gap-3">
              <button onClick={guardar} disabled={guardando} className="font-medium text-violet-600 hover:underline">
                {guardando ? "..." : "guardar"}
              </button>
              <button onClick={() => setEditando(false)} className="text-neutral-400 hover:underline">
                cancelar
              </button>
              {esManual && (
                <button onClick={eliminar} disabled={guardando} className="ml-auto text-red-500 hover:underline">
                  eliminar
                </button>
              )}
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-neutral-50">
      <td className="py-2">{m.fecha}</td>
      <td className="py-2">{m.observaciones ?? m.referencia_tipo ?? "—"}</td>
      <td className="py-2 text-right text-red-600">{m.tipo === "cargo" ? `$${formatearMoneda(Number(m.monto))}` : ""}</td>
      <td className="py-2 text-right text-green-600">{m.tipo === "pago" ? `$${formatearMoneda(Number(m.monto))}` : ""}</td>
      <td className="py-2 text-right font-medium">${formatearMoneda(saldoCorrido)}</td>
      <td className="no-print py-2 pl-3 text-right">
        <button onClick={empezarEdicion} className="text-xs text-neutral-400 hover:text-violet-600">
          editar
        </button>
      </td>
    </tr>
  );
}
