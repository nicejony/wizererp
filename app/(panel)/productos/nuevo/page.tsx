"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { subirFotoProducto } from "@/lib/fotosProductos";

interface VarianteForm {
  color: string;
  stock: string;
  stock_minimo: string;
}

export default function NuevoProductoPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    rodado: "",
    costo: "",
    moneda_costo: "ARS",
    precio_mayorista: "",
    precio_minorista: "",
    moneda_venta: "ARS",
    categoria_id: "",
  });

  const [categorias, setCategorias] = useState<{ id: string; nombre: string }[]>([]);
  const [foto, setFoto] = useState<File | null>(null);
  const [variantes, setVariantes] = useState<VarianteForm[]>([{ color: "", stock: "0", stock_minimo: "0" }]);

  useEffect(() => {
    supabase
      .from("categorias")
      .select("id, nombre")
      .order("nombre")
      .then(({ data }) => setCategorias(data ?? []));
  }, []);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateVariante(idx: number, field: keyof VarianteForm, value: string) {
    setVariantes((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  }

  function agregarColor() {
    setVariantes((prev) => [...prev, { color: "", stock: "0", stock_minimo: "0" }]);
  }

  function quitarColor(idx: number) {
    setVariantes((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data: producto, error } = await supabase
      .from("productos")
      .insert({
        codigo: form.codigo,
        nombre: form.nombre,
        rodado: form.rodado || null,
        costo: Number(form.costo) || 0,
        moneda_costo: form.moneda_costo,
        precio_mayorista: Number(form.precio_mayorista) || 0,
        precio_minorista: Number(form.precio_minorista) || 0,
        moneda_venta: form.moneda_venta,
        categoria_id: form.categoria_id || null,
      })
      .select()
      .single();

    if (error || !producto) {
      setLoading(false);
      alert("Error al guardar producto: " + error?.message);
      return;
    }

    if (foto) {
      const fotoUrl = await subirFotoProducto(producto.id, foto);
      if (fotoUrl) await supabase.from("productos").update({ foto_url: fotoUrl }).eq("id", producto.id);
    }

    const variantesPayload = variantes.map((v) => ({
      producto_id: producto.id,
      color: v.color || null,
      stock_minimo: Number(v.stock_minimo) || 0,
    }));

    const { data: variantesCreadas, error: errorVariantes } = await supabase
      .from("producto_variantes")
      .insert(variantesPayload)
      .select();

    if (errorVariantes || !variantesCreadas) {
      setLoading(false);
      alert("El producto se creó pero hubo un error con los colores: " + errorVariantes?.message);
      return;
    }

    const { data: depositoPrincipal } = await supabase.from("depositos").select("id").eq("tipo", "principal").single();

    if (depositoPrincipal) {
      const stockPayload = variantesCreadas.map((vc, idx) => ({
        variante_id: vc.id,
        deposito_id: depositoPrincipal.id,
        stock: Number(variantes[idx].stock) || 0,
      }));
      await supabase.from("variante_stock").insert(stockPayload);
    }

    setLoading(false);
    router.push("/productos");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Nuevo producto</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-4">
          <p className="text-sm font-medium text-neutral-500">Foto principal (opcional, se puede agregar después)</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
            className="input"
          />
        </div>

        <div className="card space-y-4">
          <p className="text-sm font-medium text-neutral-500">Datos generales (compartidos por todos los colores)</p>
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
              <span className="mb-1 block text-sm font-medium">Rubro</span>
              <select className="input" value={form.categoria_id} onChange={(e) => update("categoria_id", e.target.value)}>
                <option value="">Sin rubro</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Rodado</span>
              <input className="input" value={form.rodado} onChange={(e) => update("rodado", e.target.value)} />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Costo</span>
              <div className="flex gap-2">
                <input type="number" step="0.01" className="input no-spinner" value={form.costo} onChange={(e) => update("costo", e.target.value)} />
                <select className="input w-24" value={form.moneda_costo} onChange={(e) => update("moneda_costo", e.target.value)}>
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Precio Mayorista</span>
              <input type="number" step="0.01" className="input no-spinner" value={form.precio_mayorista} onChange={(e) => update("precio_mayorista", e.target.value)} />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Precio Minorista</span>
              <div className="flex gap-2">
                <input type="number" step="0.01" className="input no-spinner" value={form.precio_minorista} onChange={(e) => update("precio_minorista", e.target.value)} />
                <select className="input w-24" value={form.moneda_venta} onChange={(e) => update("moneda_venta", e.target.value)}>
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </label>
          </div>
        </div>

        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-500">Colores y stock inicial</p>
            <button type="button" onClick={agregarColor} className="text-xs font-medium text-violet-600 hover:underline">
              + agregar color
            </button>
          </div>

          {variantes.map((v, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
              <label>
                <span className="mb-1 block text-xs text-neutral-500">Color</span>
                <input className="input" value={v.color} onChange={(e) => updateVariante(idx, "color", e.target.value)} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-neutral-500">Stock</span>
                <input type="number" className="input no-spinner w-24" value={v.stock} onChange={(e) => updateVariante(idx, "stock", e.target.value)} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-neutral-500">Stock mín.</span>
                <input type="number" className="input no-spinner w-24" value={v.stock_minimo} onChange={(e) => updateVariante(idx, "stock_minimo", e.target.value)} />
              </label>
              {variantes.length > 1 && (
                <button type="button" onClick={() => quitarColor(idx)} className="mb-1 text-neutral-400 hover:text-red-600">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <button disabled={loading} className="btn-primary">
          {loading ? "Guardando..." : "Guardar producto"}
        </button>
      </form>
    </div>
  );
}

