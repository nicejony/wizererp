"use client";

import { useState, useMemo } from "react";
import { formatearMoneda } from "@/lib/format";

interface ItemTop {
  nombre: string;
  cantidad: number;
  monto: number;
}

export default function TopVendidosWidget({ datos }: { datos: ItemTop[] }) {
  const [criterio, setCriterio] = useState<"cantidad" | "monto">("cantidad");

  const top10 = useMemo(() => {
    return [...datos].sort((a, b) => b[criterio] - a[criterio]).slice(0, 10);
  }, [datos, criterio]);

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-500">Top 10 más vendidos (últimos 90 días)</p>
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 text-xs">
          <button
            onClick={() => setCriterio("cantidad")}
            className={`rounded-md px-2 py-1 font-medium ${criterio === "cantidad" ? "bg-white shadow-sm text-violet-700" : "text-neutral-500"}`}
          >
            Cantidad
          </button>
          <button
            onClick={() => setCriterio("monto")}
            className={`rounded-md px-2 py-1 font-medium ${criterio === "monto" ? "bg-white shadow-sm text-violet-700" : "text-neutral-500"}`}
          >
            $$
          </button>
        </div>
      </div>

      <ol className="space-y-2">
        {top10.map((item, idx) => (
          <li key={item.nombre} className="flex items-center justify-between border-b border-neutral-50 pb-2 text-sm">
            <span>
              <span className="mr-2 font-semibold text-neutral-400">{idx + 1}.</span>
              {item.nombre}
            </span>
            <span className="font-medium text-violet-700">
              {criterio === "cantidad" ? `${item.cantidad} u.` : `$${formatearMoneda(item.monto)}`}
            </span>
          </li>
        ))}
        {top10.length === 0 && <p className="text-sm text-neutral-400">Todavía no hay ventas registradas.</p>}
      </ol>
    </div>
  );
}
