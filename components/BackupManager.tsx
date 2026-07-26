"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Lista de tablas a respaldar. Si en el futuro agregamos una tabla nueva
// al sistema, alcanza con sumarla acá (una línea) para que entre en el backup.
const TABLAS = [
  "perfiles",
  "proveedores",
  "categorias",
  "marcas",
  "listas_precios",
  "productos",
  "producto_precios",
  "producto_variantes",
  "depositos",
  "variante_stock",
  "clientes",
  "documentos",
  "documento_items",
  "stock_movimientos",
  "inventarios",
  "inventario_items",
  "compras",
  "compra_items",
  "movimientos_cuenta",
  "cajas",
  "movimientos_caja",
];

export default function BackupManager() {
  const supabase = createClient();
  const [generando, setGenerando] = useState(false);
  const [progreso, setProgreso] = useState("");

  async function traerTablaCompleta(nombre: string) {
    const filas: any[] = [];
    const tamañoPagina = 1000;
    let desde = 0;

    while (true) {
      const { data, error } = await supabase
        .from(nombre)
        .select("*")
        .range(desde, desde + tamañoPagina - 1);

      if (error) {
        console.warn(`No se pudo leer "${nombre}": ${error.message}`);
        return filas;
      }
      if (!data || data.length === 0) break;

      filas.push(...data);
      if (data.length < tamañoPagina) break;
      desde += tamañoPagina;
    }
    return filas;
  }

  async function generarBackup() {
    setGenerando(true);
    const resultado: Record<string, any[]> = {};

    for (const tabla of TABLAS) {
      setProgreso(`Descargando ${tabla}...`);
      resultado[tabla] = await traerTablaCompleta(tabla);
    }

    const backup = {
      generado_en: new Date().toISOString(),
      tablas: resultado,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fecha = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `wizer-erp-backup-${fecha}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setGenerando(false);
    setProgreso("");
  }

  return (
    <div className="card">
      <p className="mb-2 text-sm font-medium text-neutral-500">Backup completo</p>
      <p className="mb-4 text-sm text-neutral-500">
        Descarga un archivo con todos los datos del sistema (productos, stock, ventas, clientes, etc.) para guardar como
        respaldo. Recomendado: una vez por semana, y siempre antes de un cambio grande.
      </p>
      <button onClick={generarBackup} disabled={generando} className="btn-primary">
        {generando ? progreso || "Generando..." : "⬇️ Descargar backup completo"}
      </button>
    </div>
  );
}
