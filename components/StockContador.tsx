"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface Fila {
  producto_id: string;
  nombre: string;
  categoriaNombre: string;
  color: string | null;
  stock: number;
}

type Agrupacion = "producto" | "rubro" | "color";

export default function StockContador() {
  const supabase = createClient();
  const [cargando, setCargando] = useState(true);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [agrupacion, setAgrupacion] = useState<Agrupacion>("producto");

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from("variante_resumen")
        .select("producto_id, color, stock_total, activo, productos(nombre, categorias(nombre))")
        .eq("activo", true);

      const mapeadas: Fila[] = (data ?? []).map((v: any) => ({
        producto_id: v.producto_id,
        nombre: v.productos?.nombre ?? "—",
        categoriaNombre: v.productos?.categorias?.nombre ?? "Sin rubro",
        color: v.color,
        stock: Number(v.stock_total),
      }));

      setFilas(mapeadas);
      setCargando(false);
    }
    cargar();
  }, []);

  const totalGeneral = useMemo(() => filas.reduce((s, f) => s + f.stock, 0), [filas]);

  const agrupado = useMemo(() => {
    const mapa: Record<string, { nombre: string; stock: number; articulos: number }> = {};

    for (const f of filas) {
      const clave = agrupacion === "producto" ? f.producto_id : agrupacion === "rubro" ? f.categoriaNombre : f.color ?? "Sin color";
      const nombreMostrado = agrupacion === "producto" ? f.nombre : agrupacion === "rubro" ? f.categoriaNombre : f.color ?? "Sin color";
      if (!mapa[clave]) mapa[clave] = { nombre: nombreMostrado, stock: 0, articulos: 0 };
      mapa[clave].stock += f.stock;
      mapa[clave].articulos += 1;
    }

    return Object.values(mapa).sort((a, b) => b.stock - a.stock);
  }, [filas, agrupacion]);

  if (cargando) return <p className="text-sm text-neutral-400">Cargando...</p>;

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-500">Contador de stock</p>
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 text-xs">
          <button
            onClick={() => setAgrupacion("producto")}
            className={`rounded-md px-2 py-1 font-medium ${agrupacion === "producto" ? "bg-white text-violet-700 shadow-sm" : "text-neutral-500"}`}
          >
            Por producto
          </button>
          <button
            onClick={() => setAgrupacion("rubro")}
            className={`rounded-md px-2 py-1 font-medium ${agrupacion === "rubro" ? "bg-white text-violet-700 shadow-sm" : "text-neutral-500"}`}
          >
            Por rubro
          </button>
          <button
            onClick={() => setAgrupacion("color")}
            className={`rounded-md px-2 py-1 font-medium ${agrupacion === "color" ? "bg-white text-violet-700 shadow-sm" : "text-neutral-500"}`}
          >
            Por color
          </button>
        </div>
      </div>

      <p className="mb-3 text-sm text-neutral-500">
        Total general: <span className="font-semibold text-neutral-800">{totalGeneral} unidades</span> en {filas.length} línea(s) de
        stock
      </p>

      <div className="max-h-80 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100 text-left text-neutral-500">
            <tr>
              <th className="py-2">{agrupacion === "producto" ? "Producto" : agrupacion === "rubro" ? "Rubro" : "Color"}</th>
              {agrupacion !== "color" && <th className="py-2 text-right">Artículos/colores</th>}
              <th className="py-2 text-right">Stock total</th>
            </tr>
          </thead>
          <tbody>
            {agrupado.map((g, i) => (
              <tr key={i} className="border-b border-neutral-50">
                <td className="py-2 font-medium">{g.nombre}</td>
                {agrupacion !== "color" && <td className="py-2 text-right text-neutral-500">{g.articulos}</td>}
                <td className="py-2 text-right font-semibold text-violet-700">{g.stock}</td>
              </tr>
            ))}
            {agrupado.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-neutral-400">
                  No hay stock cargado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
