"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

interface FilaExcel {
  Código: string;
  Nombre: string;
  Rubro?: string;
  Rodado?: string;
  Costo?: number;
  "Moneda Costo (ARS/USD)"?: string;
  "Precio Mayorista"?: number;
  "Precio Minorista"?: number;
  "Moneda Venta (ARS/USD)"?: string;
  Color?: string;
  "Stock inicial"?: number;
  "Stock mínimo"?: number;
}

interface GrupoProducto {
  codigo: string;
  nombre: string;
  rubro: string;
  rodado: string;
  costo: number;
  moneda_costo: string;
  precio_mayorista: number;
  precio_minorista: number;
  moneda_venta: string;
  colores: { color: string; stock: number; stock_minimo: number }[];
}

export default function ImportarProductosPage() {
  const router = useRouter();
  const supabase = createClient();
  const [grupos, setGrupos] = useState<GrupoProducto[]>([]);
  const [errores, setErrores] = useState<string[]>([]);
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState("");
  const [resultado, setResultado] = useState<string | null>(null);

  function descargarPlantilla() {
    const ejemplo: FilaExcel[] = [
      {
        Código: "BMX-001",
        Nombre: "Bicicleta Freestyle Pro",
        Rubro: "Bicicletas",
        Rodado: "20",
        Costo: 100,
        "Moneda Costo (ARS/USD)": "USD",
        "Precio Mayorista": 250,
        "Precio Minorista": 300,
        "Moneda Venta (ARS/USD)": "USD",
        Color: "Negro",
        "Stock inicial": 10,
        "Stock mínimo": 2,
      },
      {
        Código: "BMX-001",
        Nombre: "Bicicleta Freestyle Pro",
        Rubro: "Bicicletas",
        Rodado: "20",
        Costo: 100,
        "Moneda Costo (ARS/USD)": "USD",
        "Precio Mayorista": 250,
        "Precio Minorista": 300,
        "Moneda Venta (ARS/USD)": "USD",
        Color: "Violeta",
        "Stock inicial": 5,
        "Stock mínimo": 2,
      },
    ];

    const hoja = XLSX.utils.json_to_sheet(ejemplo);
    hoja["!cols"] = [
      { wch: 12 },
      { wch: 28 },
      { wch: 14 },
      { wch: 10 },
      { wch: 10 },
      { wch: 20 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
    ];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Productos");
    XLSX.writeFile(libro, "wizer-plantilla-productos.xlsx");
  }

  function manejarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const libro = XLSX.read(data, { type: "binary" });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      const filas: FilaExcel[] = XLSX.utils.sheet_to_json(hoja);

      const erroresLocales: string[] = [];
      const mapa: Record<string, GrupoProducto> = {};

      filas.forEach((fila, idx) => {
        const nFila = idx + 2;
        if (!fila["Código"] || !fila["Nombre"]) {
          erroresLocales.push(`Fila ${nFila}: falta Código o Nombre.`);
          return;
        }
        const codigo = String(fila["Código"]).trim();
        if (!mapa[codigo]) {
          mapa[codigo] = {
            codigo,
            nombre: String(fila["Nombre"]).trim(),
            rubro: fila["Rubro"] ? String(fila["Rubro"]).trim() : "",
            rodado: fila["Rodado"] ? String(fila["Rodado"]) : "",
            costo: Number(fila["Costo"]) || 0,
            moneda_costo: (fila["Moneda Costo (ARS/USD)"] || "ARS").toString().toUpperCase() === "USD" ? "USD" : "ARS",
            precio_mayorista: Number(fila["Precio Mayorista"]) || 0,
            precio_minorista: Number(fila["Precio Minorista"]) || 0,
            moneda_venta: (fila["Moneda Venta (ARS/USD)"] || "ARS").toString().toUpperCase() === "USD" ? "USD" : "ARS",
            colores: [],
          };
        }
        mapa[codigo].colores.push({
          color: fila["Color"] ? String(fila["Color"]) : "",
          stock: Number(fila["Stock inicial"]) || 0,
          stock_minimo: Number(fila["Stock mínimo"]) || 0,
        });
      });

      setGrupos(Object.values(mapa));
      setErrores(erroresLocales);
      setResultado(null);
    };
    reader.readAsBinaryString(file);
  }

  async function confirmarImportacion() {
    setImportando(true);
    setResultado(null);

    const { data: depositoPrincipal } = await supabase.from("depositos").select("id").eq("tipo", "principal").single();

    const { data: categoriasExistentes } = await supabase.from("categorias").select("id, nombre");
    const categoriaPorNombre: Record<string, string> = {};
    for (const c of categoriasExistentes ?? []) {
      categoriaPorNombre[c.nombre.trim().toLowerCase()] = c.id;
    }

    let creados = 0;
    let fallidos: string[] = [];

    for (const grupo of grupos) {
      setProgreso(`Cargando ${grupo.codigo}...`);

      let categoriaId: string | null = null;
      if (grupo.rubro) {
        const clave = grupo.rubro.toLowerCase();
        if (categoriaPorNombre[clave]) {
          categoriaId = categoriaPorNombre[clave];
        } else {
          const { data: nuevaCategoria, error: errorCategoria } = await supabase
            .from("categorias")
            .insert({ nombre: grupo.rubro })
            .select()
            .single();
          if (!errorCategoria && nuevaCategoria) {
            categoriaId = nuevaCategoria.id;
            categoriaPorNombre[clave] = nuevaCategoria.id;
          }
        }
      }

      const { data: producto, error } = await supabase
        .from("productos")
        .insert({
          codigo: grupo.codigo,
          nombre: grupo.nombre,
          categoria_id: categoriaId,
          rodado: grupo.rodado || null,
          costo: grupo.costo,
          moneda_costo: grupo.moneda_costo,
          precio_mayorista: grupo.precio_mayorista,
          precio_minorista: grupo.precio_minorista,
          moneda_venta: grupo.moneda_venta,
        })
        .select()
        .single();

      if (error || !producto) {
        fallidos.push(`${grupo.codigo}: ${error?.message ?? "error desconocido"}`);
        continue;
      }

      const variantesPayload = grupo.colores.map((c) => ({
        producto_id: producto.id,
        color: c.color || null,
        stock_minimo: c.stock_minimo,
      }));

      const { data: variantesCreadas } = await supabase.from("producto_variantes").insert(variantesPayload).select();

      if (variantesCreadas && depositoPrincipal) {
        const stockPayload = variantesCreadas.map((vc, idx) => ({
          variante_id: vc.id,
          deposito_id: depositoPrincipal.id,
          stock: grupo.colores[idx].stock,
        }));
        await supabase.from("variante_stock").insert(stockPayload);
      }

      creados++;
    }

    setImportando(false);
    setProgreso("");
    setResultado(
      `${creados} producto(s) importado(s) correctamente.` +
        (fallidos.length > 0 ? ` ${fallidos.length} con error: ${fallidos.join(" | ")}` : "")
    );
    setGrupos([]);
  }

  return (
    <div className="max-w-3xl">
      <Link href="/productos" className="text-xs text-neutral-400 hover:underline">
        ← Volver a Productos
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">Importar productos desde Excel</h1>

      <div className="card mb-4 space-y-4">
        <p className="text-sm text-neutral-500">
          Cada fila del Excel es un color. Si un producto tiene varios colores, repetí el mismo "Código" en varias
          filas — el sistema los agrupa solo. La columna "Rubro" es opcional: si escribís un rubro que ya existe lo
          reutiliza, y si es nuevo lo crea automáticamente.
        </p>
        <button onClick={descargarPlantilla} className="btn-secondary">
          ⬇️ Descargar plantilla de ejemplo
        </button>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Subir Excel completo</span>
          <input type="file" accept=".xlsx,.xls" onChange={manejarArchivo} className="input" />
        </label>
      </div>

      {errores.length > 0 && (
        <div className="card mb-4 border border-red-200 bg-red-50">
          <p className="mb-2 text-sm font-medium text-red-700">Revisá estas filas antes de importar:</p>
          {errores.map((e, i) => (
            <p key={i} className="text-xs text-red-600">
              {e}
            </p>
          ))}
        </div>
      )}

      {grupos.length > 0 && (
        <div className="card mb-4">
          <p className="mb-4 text-sm font-medium text-neutral-500">
            Vista previa: {grupos.length} producto(s), {grupos.reduce((s, g) => s + g.colores.length, 0)} color(es) en
            total
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-sm">
              <thead className="border-b border-neutral-100 text-left text-neutral-500">
                <tr>
                  <th className="py-2">Código</th>
                  <th className="py-2">Nombre</th>
                  <th className="py-2">Rubro</th>
                  <th className="py-2">Colores</th>
                  <th className="py-2 text-right">Costo</th>
                  <th className="py-2 text-right">P. Minorista</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => (
                  <tr key={g.codigo} className="border-b border-neutral-50">
                    <td className="py-2 font-mono text-xs">{g.codigo}</td>
                    <td className="py-2 font-medium">{g.nombre}</td>
                    <td className="py-2 text-neutral-500">{g.rubro || "—"}</td>
                    <td className="py-2 text-neutral-500">
                      {g.colores.map((c) => c.color || "—").join(", ")} ({g.colores.length})
                    </td>
                    <td className="py-2 text-right">
                      {g.costo} {g.moneda_costo}
                    </td>
                    <td className="py-2 text-right">
                      {g.precio_minorista} {g.moneda_venta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={confirmarImportacion} disabled={importando} className="btn-primary mt-4">
            {importando ? progreso || "Importando..." : `Confirmar importación de ${grupos.length} producto(s)`}
          </button>
        </div>
      )}

      {resultado && (
        <div className="card border border-green-200 bg-green-50">
          <p className="text-sm text-green-700">{resultado}</p>
          <button onClick={() => router.push("/productos")} className="btn-secondary mt-3">
            Ir a Productos
          </button>
        </div>
      )}
    </div>
  );
}
