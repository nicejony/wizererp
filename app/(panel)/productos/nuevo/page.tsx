"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NuevoProductoPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    color: "",
    rodado: "",
    costo: "",
    precio_mayorista: "",
    precio_minorista: "",
    stock: "0",
    stock_minimo: "0",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("productos").insert({
      codigo: form.codigo,
      nombre: form.nombre,
      color: form.color || null,
      rodado: form.rodado || null,
      costo: Number(form.costo) || 0,
      precio_mayorista: Number(form.precio_mayorista) || 0,
      precio_minorista: Number(form.precio_minorista) || 0,
      stock: Number(form.stock) || 0,
      stock_minimo: Number(form.stock_minimo) || 0,
    });

    setLoading(false);
    if (!error) router.push("/productos");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Nuevo producto</h1>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-medium">Código *</span>
            <input required className="input" value={form.codigo} onChange={(e) => update("codigo", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Nombre *</span>
            <input required className="input" value={form.nombre} onChange={(e) => update("nombre", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Color</span>
            <input className="input" value={form.color} onChange={(e) => update("color", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Rodado</span>
            <input className="input" value={form.rodado} onChange={(e) => update("rodado", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Costo</span>
            <input type="number" step="0.01" className="input" value={form.costo} onChange={(e) => update("costo", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Precio Mayorista</span>
            <input type="number" step="0.01" className="input" value={form.precio_mayorista} onChange={(e) => update("precio_mayorista", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Precio Minorista</span>
            <input type="number" step="0.01" className="input" value={form.precio_minorista} onChange={(e) => update("precio_minorista", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Stock inicial</span>
            <input type="number" className="input" value={form.stock} onChange={(e) => update("stock", e.target.value)} />
          </label>
        </div>

        <button disabled={loading} className="btn-primary">
          {loading ? "Guardando..." : "Guardar producto"}
        </button>
      </form>
    </div>
  );
}
