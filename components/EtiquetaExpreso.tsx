"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BotonImprimir from "@/components/BotonImprimir";

interface Remitente {
  razon_social: string | null;
  cuit: string | null;
  direccion: string | null;
  telefono: string | null;
}

export default function EtiquetaExpreso({ cliente }: { cliente: any }) {
  const supabase = createClient();
  const [nombreExpreso, setNombreExpreso] = useState(cliente.nombre_expreso ?? "");
  const [remitente, setRemitente] = useState<Remitente | null>(null);

  useEffect(() => {
    supabase
      .from("remitente")
      .select("razon_social, cuit, direccion, telefono")
      .limit(1)
      .single()
      .then(({ data }) => setRemitente(data));
  }, []);

  const ciudadLinea = [cliente.direccion, cliente.localidad, cliente.provincia, cliente.codigo_postal && `CP ${cliente.codigo_postal}`]
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

      <div className="card relative space-y-4 border-2 border-neutral-800 text-lg">
        <span className="absolute right-4 top-4 text-xs font-bold tracking-wide text-violet-700">WIZER</span>

        {remitente && (remitente.razon_social || remitente.cuit || remitente.direccion || remitente.telefono) && (
          <div className="border-b border-neutral-200 pb-3 text-sm text-neutral-600">
            <p className="text-xs font-medium text-neutral-400">Remitente</p>
            <p className="font-medium text-neutral-800">{remitente.razon_social || "—"}</p>
            {remitente.cuit && <p>CUIT: {remitente.cuit}</p>}
            {remitente.direccion && <p>{remitente.direccion}</p>}
            {remitente.telefono && <p>Tel: {remitente.telefono}</p>}
          </div>
        )}

        <p className="text-2xl font-bold">{cliente.nombre}</p>
        {cliente.observaciones && <p className="text-base text-neutral-700">{cliente.observaciones}</p>}
        {cliente.cuit && <p className="text-sm text-neutral-600">CUIT: {cliente.cuit}</p>}

        <p className="border-t border-neutral-200 pt-4">Dirección: {ciudadLinea || "—"}</p>

        {cliente.telefono && <p>Tel: {cliente.telefono}</p>}

        <p className="mt-6 text-xl font-bold">{nombreExpreso || "—"}</p>
      </div>
    </div>
  );
}
