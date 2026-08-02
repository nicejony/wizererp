"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatearMoneda } from "@/lib/format";

export default function TipoCambioManager({ tipoCambio }: { tipoCambio: any }) {
  const router = useRouter();
  const supabase = createClient();
  const [valor, setValor] = useState(String(tipoCambio?.valor ?? 1));
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!tipoCambio?.id || !valor || Number(valor) <= 0) return;
    setGuardando(true);
    const { error } = await supabase
      .from("tipo_cambio")
      .update({ valor: Number(valor), actualizado_en: new Date().toISOString() })
      .eq("id", tipoCambio.id);
    setGuardando(false);
    if (error) return alert("Error: " + error.message);
    router.refresh();
  }

  return (
    <div className="card">
      <p className="mb-1 text-sm font-medium text-neutral-500">Tipo de cambio (USD)</p>
      <p className="mb-4 text-xs text-neutral-400">
        Se usa para sugerir precios en pesos de productos cargados en dólares. No afecta ventas o compras ya
        guardadas — cada una queda fija en el valor que tenía al momento de cargarla.
      </p>
      <div className="flex items-end gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-neutral-500">1 USD = $ ARS</span>
          <input type="number" step="0.01" className="input no-spinner" value={valor} onChange={(e) => setValor(e.target.value)} />
        </label>
        <button onClick={guardar} disabled={guardando} className="btn-primary whitespace-nowrap">
          {guardando ? "..." : "Guardar"}
        </button>
      </div>
      {tipoCambio?.actualizado_en && (
        <p className="mt-2 text-xs text-neutral-400">
          Última actualización: {new Date(tipoCambio.actualizado_en).toLocaleString("es-AR")} — $
          {formatearMoneda(Number(tipoCambio.valor))}
        </p>
      )}
    </div>
  );
}
