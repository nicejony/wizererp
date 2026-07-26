"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ROLES = ["admin", "ventas", "deposito", "lectura"] as const;

export default function ConfiguracionPanel({
  usuariosIniciales,
  categoriasIniciales,
  marcasIniciales,
}: {
  usuariosIniciales: any[];
  categoriasIniciales: any[];
  marcasIniciales: any[];
}) {
  const supabase = createClient();

  const [usuarios, setUsuarios] = useState(usuariosIniciales);
  const [categorias, setCategorias] = useState(categoriasIniciales);
  const [marcas, setMarcas] = useState(marcasIniciales);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [nuevaMarca, setNuevaMarca] = useState("");

  async function cambiarRol(id: string, rol: string) {
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, rol } : u)));
    const { error } = await supabase.from("perfiles").update({ rol }).eq("id", id);
    if (error) alert("Error al cambiar el rol: " + error.message);
  }

  async function agregarCategoria() {
    if (!nuevaCategoria.trim()) return;
    const { data, error } = await supabase.from("categorias").insert({ nombre: nuevaCategoria.trim() }).select().single();
    if (error) return alert("Error: " + error.message);
    setCategorias((prev) => [...prev, data]);
    setNuevaCategoria("");
  }

  async function eliminarCategoria(id: string) {
    await supabase.from("categorias").delete().eq("id", id);
    setCategorias((prev) => prev.filter((c) => c.id !== id));
  }

  async function agregarMarca() {
    if (!nuevaMarca.trim()) return;
    const { data, error } = await supabase.from("marcas").insert({ nombre: nuevaMarca.trim() }).select().single();
    if (error) return alert("Error: " + error.message);
    setMarcas((prev) => [...prev, data]);
    setNuevaMarca("");
  }

  async function eliminarMarca(id: string) {
    await supabase.from("marcas").delete().eq("id", id);
    setMarcas((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <p className="mb-4 text-sm font-medium text-neutral-500">Usuarios y roles</p>
        <div className="space-y-2">
          {usuarios.map((u) => (
            <div key={u.id} className="flex items-center justify-between border-b border-neutral-50 pb-2">
              <span className="font-medium">{u.nombre}</span>
              <select className="input w-36 py-1" value={u.rol} onChange={(e) => cambiarRol(u.id, e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {usuarios.length === 0 && <p className="text-sm text-neutral-400">No hay usuarios cargados.</p>}
        </div>
      </div>

      <div className="card">
        <p className="mb-4 text-sm font-medium text-neutral-500">Categorías de producto</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {categorias.map((c) => (
            <span key={c.id} className="flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
              {c.nombre}
              <button onClick={() => eliminarCategoria(c.id)} className="text-neutral-400 hover:text-red-600">
                ✕
              </button>
            </span>
          ))}
          {categorias.length === 0 && <p className="text-sm text-neutral-400">Sin categorías todavía.</p>}
        </div>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Nueva categoría..."
            value={nuevaCategoria}
            onChange={(e) => setNuevaCategoria(e.target.value)}
          />
          <button onClick={agregarCategoria} className="btn-secondary whitespace-nowrap">
            + Agregar
          </button>
        </div>
      </div>

      <div className="card">
        <p className="mb-4 text-sm font-medium text-neutral-500">Marcas</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {marcas.map((m) => (
            <span key={m.id} className="flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
              {m.nombre}
              <button onClick={() => eliminarMarca(m.id)} className="text-neutral-400 hover:text-red-600">
                ✕
              </button>
            </span>
          ))}
          {marcas.length === 0 && <p className="text-sm text-neutral-400">Sin marcas todavía.</p>}
        </div>
        <div className="flex gap-2">
          <input className="input" placeholder="Nueva marca..." value={nuevaMarca} onChange={(e) => setNuevaMarca(e.target.value)} />
          <button onClick={agregarMarca} className="btn-secondary whitespace-nowrap">
            + Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
