"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PreciosUsdProducto({
  productoId,
  mayoristaInicial,
  minoristaInicial,
}: {
  productoId: string;
  mayoristaInicial: number | null;
  minoristaInicial: number | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [mayorista, setMayorista] = useState(mayoristaInicial != null ? String(mayoristaInicial) : "");
  const [minorista, setMinorista] = useState(minoristaInicial != null ? String(minoristaInicial) : "");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    const { error } = await supabase
      .from("productos")
      .update({
        precio_mayorista_usd: mayorista === "" ? null : Number(mayorista),
        precio_minorista_usd: minorista === "" ? null : Number(minorista),
      })
      .eq("id", productoId);
    setGuardando(false);
    if (error) alert("Error al guardar: " + error.message);
    else router.refresh();
  }

  return (
    <div className="card space-y-4">
      <div>
        <p className="text-sm font-medium text-neutral-500">Precios de venta en dólares (U$D)</p>
        <p className="text-xs text-neutral-400">
          Se usan al armar un presupuesto en dólares, tal cual, sin cotización. Si quedan vacíos, el producto sale sin precio en el presupuesto y lo cargás a mano.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium">Mayorista (U$D)</span>
          <input type="number" step="0.01" className="input no-spinner" value={mayorista} onChange={(e) => setMayorista(e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Minorista (U$D)</span>
          <input type="number" step="0.01" className="input no-spinner" value={minorista} onChange={(e) => setMinorista(e.target.value)} />
        </label>
      </div>
      <button onClick={guardar} disabled={guardando} className="btn-primary">
        {guardando ? "Guardando..." : "Guardar precios en U$D"}
      </button>
    </div>
  );
}
