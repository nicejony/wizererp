"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Embarque {
  id: string;
  descripcion: string;
  fecha: string;
}

export default function EmbarquesWidget({ embarquesIniciales }: { embarquesIniciales: Embarque[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [embarques, setEmbarques] = useState(embarquesIniciales);
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  async function agregar() {
    if (!descripcion.trim() || !fecha) return;
    setAgregando(true);
    const { data, error } = await supabase
      .from("embarques")
      .insert({ descripcion: descripcion.trim(), fecha })
      .select()
      .single();
    setAgregando(false);
    if (error) return alert("Error: " + error.message);
    setEmbarques((prev) => [...prev, data].sort((a, b) => a.fecha.localeCompare(b.fecha)));
    setDescripcion("");
    setFecha("");
    setMostrarForm(false);
  }

  async function marcarLlegado(id: string) {
    await supabase.from("embarques").update({ activo: false }).eq("id", id);
    setEmbarques((prev) => prev.filter((e) => e.id !== id));
    router.refresh();
  }

  function diasRestantes(fechaStr: string) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = new Date(fechaStr + "T00:00:00");
    return Math.round((fecha.getTime() - hoy.getTime()) / 86400000);
  }

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-500">Embarques / pedidos en camino</p>
        <button onClick={() => setMostrarForm((v) => !v)} className="text-xs font-medium text-violet-600 hover:underline">
          {mostrarForm ? "cancelar" : "+ agregar"}
        </button>
      </div>

      {mostrarForm && (
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg bg-neutral-50 p-3">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-neutral-500">Descripción</span>
            <input
              className="input"
              placeholder="Ej: Contenedor cuadros BMX"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs text-neutral-500">Fecha estimada</span>
            <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
          <button onClick={agregar} disabled={agregando} className="btn-primary whitespace-nowrap">
            {agregando ? "..." : "Guardar"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {embarques.map((e) => {
          const dias = diasRestantes(e.fecha);
          return (
            <div key={e.id} className="flex items-center justify-between border-b border-neutral-50 pb-2">
              <div>
                <p className="text-sm font-medium">{e.descripcion}</p>
                <p className="text-xs text-neutral-400">{e.fecha}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-semibold ${
                    dias < 0 ? "text-red-600" : dias <= 3 ? "text-amber-600" : "text-neutral-600"
                  }`}
                >
                  {dias === 0 ? "Hoy" : dias > 0 ? `Faltan ${dias} días` : `Atrasado ${Math.abs(dias)} días`}
                </span>
                <button onClick={() => marcarLlegado(e.id)} className="text-xs text-neutral-400 hover:text-green-600">
                  ✓ llegó
                </button>
              </div>
            </div>
          );
        })}
        {embarques.length === 0 && <p className="text-sm text-neutral-400">No hay embarques cargados.</p>}
      </div>
    </div>
  );
}
