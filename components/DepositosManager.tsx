"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Deposito } from "@/lib/types";

export default function DepositosManager({ depositos }: { depositos: Deposito[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState(false);

  async function crearDeposito() {
    if (!nombre.trim()) return;
    setGuardando(true);
    const { error } = await supabase.from("depositos").insert({ nombre: nombre.trim(), tipo: "secundario" });
    setGuardando(false);
    if (error) {
      alert("Error al crear el depósito: " + error.message);
      return;
    }
    setNombre("");
    setAbierto(false);
    router.refresh();
  }

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {depositos.map((d) => (
            <span
              key={d.id}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                d.tipo === "principal" ? "bg-violet-50 text-violet-700" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {d.nombre}
            </span>
          ))}
        </div>
        <button onClick={() => setAbierto((v) => !v)} className="text-xs font-medium text-violet-600 hover:underline">
          {abierto ? "cancelar" : "+ agregar depósito"}
        </button>
      </div>

      {abierto && (
        <div className="mt-3 flex items-end gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-neutral-500">Nombre del depósito</span>
            <input
              className="input"
              placeholder="Ej: Depósito 2, Sucursal Norte..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>
          <button onClick={crearDeposito} disabled={guardando} className="btn-primary">
            {guardando ? "..." : "Crear"}
          </button>
        </div>
      )}
    </div>
  );
}
