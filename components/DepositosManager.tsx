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
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");

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

  function empezarEdicion(d: Deposito) {
    setEditandoId(d.id);
    setNombreEditado(d.nombre);
  }

  async function guardarEdicion(id: string) {
    if (!nombreEditado.trim()) return;
    const { error } = await supabase.from("depositos").update({ nombre: nombreEditado.trim() }).eq("id", id);
    if (error) {
      alert("Error al renombrar: " + error.message);
      return;
    }
    setEditandoId(null);
    router.refresh();
  }

  async function eliminarDeposito(d: Deposito) {
    if (d.tipo === "principal") {
      alert("El depósito Principal no se puede eliminar.");
      return;
    }

    const { data: stock } = await supabase.from("variante_stock").select("stock").eq("deposito_id", d.id);
    const tieneStock = (stock ?? []).some((s) => Number(s.stock) > 0);

    if (tieneStock) {
      alert("Este depósito todavía tiene stock cargado. Transferí todo a otro depósito antes de eliminarlo.");
      return;
    }

    if (!confirm(`¿Eliminar el depósito "${d.nombre}"? Se conserva en el historial, pero no vas a poder usarlo más.`)) return;

    const { error } = await supabase.from("depositos").update({ activo: false }).eq("id", d.id);
    if (error) {
      alert("Error al eliminar: " + error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card mb-6">
      <div className="flex flex-wrap items-center gap-2">
        {depositos.map((d) =>
          editandoId === d.id ? (
            <div key={d.id} className="flex items-center gap-1">
              <input
                className="input w-32 py-1 text-xs"
                value={nombreEditado}
                onChange={(e) => setNombreEditado(e.target.value)}
                autoFocus
              />
              <button onClick={() => guardarEdicion(d.id)} className="text-xs font-medium text-violet-600 hover:underline">
                guardar
              </button>
              <button onClick={() => setEditandoId(null)} className="text-xs text-neutral-400 hover:underline">
                cancelar
              </button>
            </div>
          ) : (
            <span
              key={d.id}
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                d.tipo === "principal" ? "bg-violet-50 text-violet-700" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {d.nombre}
              <button onClick={() => empezarEdicion(d)} className="text-neutral-400 hover:text-violet-600" title="Editar nombre">
                ✎
              </button>
              {d.tipo !== "principal" && (
                <button onClick={() => eliminarDeposito(d)} className="text-neutral-400 hover:text-red-600" title="Eliminar">
                  ✕
                </button>
              )}
            </span>
          )
        )}

        <button onClick={() => setAbierto((v) => !v)} className="ml-auto text-xs font-medium text-violet-600 hover:underline">
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
