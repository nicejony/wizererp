"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Producto, ProductoVariante, Deposito, VarianteStock, Categoria } from "@/lib/types";
import FotoProductoUploader from "@/components/FotoProductoUploader";

export default function ProductoEditor({
  producto,
  variantesIniciales,
  depositos,
  stockPorDepositoInicial,
  categorias,
}: {
  producto: Producto;
  variantesIniciales: ProductoVariante[];
  depositos: Deposito[];
  stockPorDepositoInicial: VarianteStock[];
  categorias: Categoria[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    nombre: producto.nombre,
    rodado: producto.rodado ?? "",
    costo: String(producto.costo),
    moneda_costo: producto.moneda_costo ?? "ARS",
    precio_mayorista: String(producto.precio_mayorista),
    precio_minorista: String(producto.precio_minorista),
    moneda_venta: producto.moneda_venta ?? "ARS",
    categoria_id: producto.categoria_id ?? "",
  });
  const [guardandoProducto, setGuardandoProducto] = useState(false);

  const [variantes, setVariantes] = useState(variantesIniciales);
  const [nuevoColor, setNuevoColor] = useState({ color: "", stock: "0", stock_minimo: "0" });
  const [agregandoColor, setAgregandoColor] = useState(false);

  const construirMapa = (rows: VarianteStock[]) => {
    const mapa: Record<string, Record<string, number>> = {};
    for (const v of variantesIniciales) mapa[v.id] = {};
    for (const row of rows) {
      if (!mapa[row.variante_id]) mapa[row.variante_id] = {};
      mapa[row.variante_id][row.deposito_id] = row.stock;
    }
    return mapa;
  };
  const [stockMapa, setStockMapa] = useState(construirMapa(stockPorDepositoInicial));
  const depositoPrincipal = depositos.find((d) => d.tipo === "principal");

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function guardarProducto() {
    setGuardandoProducto(true);
    const { error } = await supabase
      .from("productos")
      .update({
        nombre: form.nombre,
        rodado: form.rodado || null,
        costo: Number(form.costo) || 0,
        moneda_costo: form.moneda_costo,
        precio_mayorista: Number(form.precio_mayorista) || 0,
        precio_minorista: Number(form.precio_minorista) || 0,
        moneda_venta: form.moneda_venta,
        categoria_id: form.categoria_id || null,
      })
      .eq("id", producto.id);
    setGuardandoProducto(false);
    if (error) alert("Error al guardar: " + error.message);
    else router.refresh();
  }

  function actualizarVariante(idx: number, campo: "color" | "stock_minimo" | "stock_ideal", valor: string) {
    setVariantes((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [campo]: campo === "color" ? valor : Number(valor) || 0 } : v))
    );
  }

  async function guardarVariante(v: ProductoVariante) {
    const { error } = await supabase
      .from("producto_variantes")
      .update({ color: v.color, stock_minimo: v.stock_minimo, stock_ideal: v.stock_ideal })
      .eq("id", v.id);
    if (error) alert("Error al guardar el color: " + error.message);
    else router.refresh();
  }

  async function desactivarVariante(id: string) {
    if (!confirm("¿Desactivar este color? No se va a poder seguir vendiendo, pero se conserva el historial.")) return;
    const { error } = await supabase.from("producto_variantes").update({ activo: false }).eq("id", id);
    if (error) alert("Error: " + error.message);
    else {
      setVariantes((prev) => prev.filter((v) => v.id !== id));
      router.refresh();
    }
  }

  function actualizarStockLocal(varianteId: string, depositoId: string, valor: string) {
    setStockMapa((prev) => ({
      ...prev,
      [varianteId]: { ...prev[varianteId], [depositoId]: Number(valor) || 0 },
    }));
  }

  async function guardarStock(varianteId: string, depositoId: string) {
    const stock = stockMapa[varianteId]?.[depositoId] ?? 0;
    const { error } = await supabase
      .from("variante_stock")
      .upsert({ variante_id: varianteId, deposito_id: depositoId, stock }, { onConflict: "variante_id,deposito_id" });
    if (error) alert("Error al guardar el stock: " + error.message);
    else router.refresh();
  }

  async function agregarColor() {
    if (!depositoPrincipal) {
      alert("No se encontró el depósito Principal. Revisá la migración de depósitos en Supabase.");
      return;
    }
    setAgregandoColor(true);
    const { data, error } = await supabase
      .from("producto_variantes")
      .insert({
        producto_id: producto.id,
        color: nuevoColor.color || null,
        stock_minimo: Number(nuevoColor.stock_minimo) || 0,
      })
      .select()
      .single();

    if (error || !data) {
      setAgregandoColor(false);
      alert("Error al agregar el color: " + error?.message);
      return;
    }

    await supabase.from("variante_stock").insert({
      variante_id: data.id,
      deposito_id: depositoPrincipal.id,
      stock: Number(nuevoColor.stock) || 0,
    });

    setAgregandoColor(false);
    setVariantes((prev) => [...prev, data]);
    setStockMapa((prev) => ({ ...prev, [data.id]: { [depositoPrincipal.id]: Number(nuevoColor.stock) || 0 } }));
    setNuevoColor({ color: "", stock: "0", stock_minimo: "0" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <FotoProductoUploader productoId={producto.id} fotoUrlInicial={producto.foto_url} />
      </div>

      <div className="card space-y-4">
        <p className="text-sm font-medium text-neutral-500">Datos generales</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-medium">Código</span>
            <input disabled className="input bg-neutral-50 text-neutral-500" value={producto.codigo} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Nombre</span>
            <input className="input" value={form.nombre} onChange={(e) => update("nombre", e.target.value)} />
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
        <button onClick={guardarProducto} disabled={guardandoProducto} className="btn-primary">
          {guardandoProducto ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      <div className="card space-y-4">
        <p className="text-sm font-medium text-neutral-500">Colores y stock por depósito</p>

        {variantes.map((v, idx) => (
          <div key={v.id} className="space-y-2 border-b border-neutral-50 pb-4">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-end gap-2">
              <label>
                <span className="mb-1 block text-xs text-neutral-500">Color</span>
                <input className="input" value={v.color ?? ""} onChange={(e) => actualizarVariante(idx, "color", e.target.value)} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-neutral-500">Stock mín.</span>
                <input type="number" className="input no-spinner w-24" value={v.stock_minimo} onChange={(e) => actualizarVariante(idx, "stock_minimo", e.target.value)} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-neutral-500">Stock ideal</span>
                <input type="number" className="input no-spinner w-24" value={v.stock_ideal} onChange={(e) => actualizarVariante(idx, "stock_ideal", e.target.value)} />
              </label>
              <button onClick={() => guardarVariante(v)} className="btn-secondary mb-1 whitespace-nowrap">
                Guardar
              </button>
              <button onClick={() => desactivarVariante(v.id)} className="mb-1 text-neutral-400 hover:text-red-600">
                ✕
              </button>
            </div>

            <div className="flex flex-wrap gap-3 rounded-lg bg-neutral-50 p-3">
              {depositos.map((dep) => (
                <div key={dep.id} className="flex items-end gap-2">
                  <label>
                    <span className="mb-1 block text-xs text-neutral-500">{dep.nombre}</span>
                    <input
                      type="number"
                      className="input no-spinner w-20 py-1"
                      value={stockMapa[v.id]?.[dep.id] ?? 0}
                      onChange={(e) => actualizarStockLocal(v.id, dep.id, e.target.value)}
                    />
                  </label>
                  <button onClick={() => guardarStock(v.id, dep.id)} className="mb-1 text-xs font-medium text-violet-600 hover:underline">
                    guardar
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div>
          <p className="mb-2 text-xs font-medium text-neutral-500">Agregar color nuevo</p>
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
            <label>
              <span className="mb-1 block text-xs text-neutral-500">Color</span>
              <input
                className="input"
                placeholder="Ej: Violeta"
                value={nuevoColor.color}
                onChange={(e) => setNuevoColor((c) => ({ ...c, color: e.target.value }))}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs text-neutral-500">Stock inicial ({depositoPrincipal?.nombre ?? "Principal"})</span>
              <input
                type="number"
                className="input no-spinner w-24"
                value={nuevoColor.stock}
                onChange={(e) => setNuevoColor((c) => ({ ...c, stock: e.target.value }))}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs text-neutral-500">Stock mín.</span>
              <input
                type="number"
                className="input no-spinner w-24"
                value={nuevoColor.stock_minimo}
                onChange={(e) => setNuevoColor((c) => ({ ...c, stock_minimo: e.target.value }))}
              />
            </label>
            <button onClick={agregarColor} disabled={agregandoColor} className="btn-primary mb-1 whitespace-nowrap">
              {agregandoColor ? "..." : "+ agregar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


