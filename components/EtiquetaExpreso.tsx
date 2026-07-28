"use client";

import { useState } from "react";
import Link from "next/link";
import BotonImprimir from "@/components/BotonImprimir";

export default function EtiquetaExpreso({ cliente }: { cliente: any }) {
  const [nombreExpreso, setNombreExpreso] = useState(cliente.nombre_expreso ?? "");

  const ciudadLinea = [cliente.direccion, cliente.localidad, cliente.provincia, cliente.codigo_postal]
    .filter(Boolean)
    .join(" — ");

  return (
    <div className="max-w-md">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href={`/clientes/${cliente.id}`} className="text-xs text-neutral-400 hover:underline">
          ← Volver al cliente
        </Link>
        <BotonImprimir />
      </div>

      <div className="no-print card mb-4">
        <label>
          <span className="mb-1 block text-sm font-medium">Nombre del expreso (para este envío)</span>
          <input className="input" value={nombreExpreso} onChange={(e) => setNombreExpreso(e.target.value)} />
        </label>
      </div>

      <div className="card space-y-4 border-2 border-neutral-800 text-lg">
        <p className="text-2xl font-bold">{cliente.nombre}</p>
        {cliente.cuit && <p className="text-neutral-600">CUIT: {cliente.cuit}</p>}

        <p className="border-t border-neutral-200 pt-4">{ciudadLinea || "—"}</p>

        {cliente.telefono && <p>Tel: {cliente.telefono}</p>}

        <p className="mt-6 text-xl font-bold">{nombreExpreso || "—"}</p>
      </div>
    </div>
  );
}
