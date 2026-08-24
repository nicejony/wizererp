"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatearMoneda } from "@/lib/format";
import BotonImprimir from "@/components/BotonImprimir";
import jsPDF from "jspdf";

interface ProductoLista {
  id: string;
  codigo: string;
  nombre: string;
  precio_mayorista: number;
  precio_minorista: number;
  moneda_venta: string;
  foto_url: string | null;
  activo: boolean;
  categoria_id: string | null;
  categoriaNombre: string;
  colores: string[];
}

type TipoPrecioLista = "mayorista" | "minorista" | "ambos";
type Presentacion = "lista" | "catalogo";
type Orden = "rubro_nombre" | "nombre" | "codigo";

export default function ListasPreciosPanel() {
  const supabase = createClient();

  const [cargando, setCargando] = useState(true);
  const [productos, setProductos] = useState<ProductoLista[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nombre: string }[]>([]);

  const [tipoPrecio, setTipoPrecio] = useState<TipoPrecioLista>("mayorista");
  const [rubrosSel, setRubrosSel] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);

  const [presentacion, setPresentacion] = useState<Presentacion>("lista");
  const [mostrarFoto, setMostrarFoto] = useState(true);
  const [mostrarCodigo, setMostrarCodigo] = useState(true);
  const [mostrarRubro, setMostrarRubro] = useState(true);
  const [orden, setOrden] = useState<Orden>("rubro_nombre");
  const [titulo, setTitulo] = useState("Lista de precios Wizer");

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [misListas, setMisListas] = useState<{ id: string; nombre: string; configuracion: any }[]>([]);
  const [guardandoLista, setGuardandoLista] = useState(false);

  useEffect(() => {
    async function cargar() {
      const [{ data: prods }, { data: cats }, { data: listas }] = await Promise.all([
        supabase
          .from("productos")
          .select(
            "id, codigo, nombre, precio_mayorista, precio_minorista, moneda_venta, foto_url, activo, categoria_id, categorias(nombre), producto_variantes(color, activo)"
          ),
        supabase.from("categorias").select("id, nombre").order("nombre"),
        supabase.from("listas_guardadas").select("*").order("nombre"),
      ]);

      const mapeados: ProductoLista[] = (prods ?? []).map((p: any) => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        precio_mayorista: Number(p.precio_mayorista),
        precio_minorista: Number(p.precio_minorista),
        moneda_venta: p.moneda_venta,
        foto_url: p.foto_url,
        activo: p.activo,
        categoria_id: p.categoria_id,
        categoriaNombre: p.categorias?.nombre ?? "Sin rubro",
        colores: Array.from(new Set((p.producto_variantes ?? []).filter((v: any) => v.activo && v.color).map((v: any) => v.color as string))) as string[],
      }));

      setProductos(mapeados);
      setCategorias(cats ?? []);
      setMisListas(listas ?? []);
      setSeleccionados(new Set(mapeados.filter((p) => p.activo).map((p) => p.id)));
      setCargando(false);
    }
    cargar();
  }, []);

  const resultadosFiltrados = useMemo(() => {
    return productos
      .filter((p) => (soloActivos ? p.activo : true))
      .filter((p) => (rubrosSel.size === 0 ? true : p.categoria_id && rubrosSel.has(p.categoria_id)))
      .filter((p) => {
        if (!busqueda.trim()) return true;
        const q = busqueda.toLowerCase();
        return p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q);
      });
  }, [productos, soloActivos, rubrosSel, busqueda]);

  const productosParaLista = useMemo(() => {
    const elegidos = productos.filter((p) => seleccionados.has(p.id));
    const ordenados = [...elegidos].sort((a, b) => {
      if (orden === "codigo") return a.codigo.localeCompare(b.codigo);
      if (orden === "nombre") return a.nombre.localeCompare(b.nombre);
      const rubroCmp = a.categoriaNombre.localeCompare(b.categoriaNombre);
      return rubroCmp !== 0 ? rubroCmp : a.nombre.localeCompare(b.nombre);
    });
    return ordenados;
  }, [productos, seleccionados, orden]);

  function toggleRubro(id: string) {
    setRubrosSel((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  function toggleSeleccion(id: string) {
    setSeleccionados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  function seleccionarTodosResultados() {
    setSeleccionados((prev) => {
      const nuevo = new Set(prev);
      resultadosFiltrados.forEach((p) => nuevo.add(p.id));
      return nuevo;
    });
  }

  function quitarTodosResultados() {
    setSeleccionados((prev) => {
      const nuevo = new Set(prev);
      resultadosFiltrados.forEach((p) => nuevo.delete(p.id));
      return nuevo;
    });
  }

  function construirConfiguracionActual() {
    return {
      tipoPrecio,
      rubrosSel: Array.from(rubrosSel),
      soloActivos,
      presentacion,
      mostrarFoto,
      mostrarCodigo,
      mostrarRubro,
      orden,
      titulo,
      seleccionados: Array.from(seleccionados),
    };
  }

  function aplicarConfiguracion(config: any) {
    setTipoPrecio(config.tipoPrecio ?? "mayorista");
    setRubrosSel(new Set(config.rubrosSel ?? []));
    setSoloActivos(config.soloActivos ?? true);
    setPresentacion(config.presentacion ?? "lista");
    setMostrarFoto(config.mostrarFoto ?? true);
    setMostrarCodigo(config.mostrarCodigo ?? true);
    setMostrarRubro(config.mostrarRubro ?? true);
    setOrden(config.orden ?? "rubro_nombre");
    setTitulo(config.titulo ?? "Lista de precios Wizer");
    setSeleccionados(new Set(config.seleccionados ?? []));
  }

  async function guardarComoNueva() {
    const nombre = window.prompt("Nombre para esta lista (ej: Lista Mayorista Completa):");
    if (!nombre || !nombre.trim()) return;
    setGuardandoLista(true);
    const { data, error } = await supabase
      .from("listas_guardadas")
      .insert({ nombre: nombre.trim(), configuracion: construirConfiguracionActual() })
      .select()
      .single();
    setGuardandoLista(false);
    if (error || !data) return alert("Error al guardar: " + error?.message);
    setMisListas((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
  }

  function cargarLista(lista: { configuracion: any }) {
    aplicarConfiguracion(lista.configuracion);
  }

  async function duplicarLista(lista: { nombre: string; configuracion: any }) {
    const nombre = window.prompt("Nombre para la copia:", `Copia de ${lista.nombre}`);
    if (!nombre || !nombre.trim()) return;
    const { data, error } = await supabase
      .from("listas_guardadas")
      .insert({ nombre: nombre.trim(), configuracion: lista.configuracion })
      .select()
      .single();
    if (error || !data) return alert("Error al duplicar: " + error?.message);
    setMisListas((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
  }

  async function eliminarLista(id: string) {
    if (!confirm("¿Eliminar esta lista guardada? (Los productos no se ven afectados, solo se borra la configuración)")) return;
    await supabase.from("listas_guardadas").delete().eq("id", id);
    setMisListas((prev) => prev.filter((l) => l.id !== id));
  }

  async function imagenABase64(url: string): Promise<string | null> {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  async function construirPDF(): Promise<jsPDF> {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margen = 15;
    const anchoUtil = 210 - margen * 2;
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(124, 58, 237);
    doc.text("WIZER BIKES", margen, y);
    y += 8;
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text(titulo || "Lista de precios Wizer", margen, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Precios actualizados al: ${new Date().toLocaleDateString("es-AR")}`, margen, y);
    y += 10;

    const imagenesCache: Record<string, string | null> = {};
    if (mostrarFoto) {
      for (const p of productosParaLista) {
        if (p.foto_url && !(p.id in imagenesCache)) {
          imagenesCache[p.id] = await imagenABase64(p.foto_url);
        }
      }
    }

    if (presentacion === "lista") {
      const colFoto = margen;
      const colCodigo = margen + (mostrarFoto ? 16 : 0);
      const colNombre = colCodigo + (mostrarCodigo ? 24 : 0);
      const colPrecioX = margen + anchoUtil;

      function encabezado() {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(90, 90, 90);
        if (mostrarCodigo) doc.text("Código", colCodigo, y);
        doc.text("Producto", colNombre, y);
        const labelPrecio = tipoPrecio === "ambos" ? "May. / Min." : tipoPrecio === "mayorista" ? "Mayorista" : "Minorista";
        doc.text(labelPrecio, colPrecioX, y, { align: "right" });
        y += 2;
        doc.setDrawColor(220, 220, 220);
        doc.line(margen, y, margen + anchoUtil, y);
        y += 5;
      }
      encabezado();

      for (const p of productosParaLista) {
        const alturaFila = mostrarFoto ? 14 : 7;
        if (y + alturaFila > 280) {
          doc.addPage();
          y = 20;
          encabezado();
        }

        if (mostrarFoto) {
          const img = imagenesCache[p.id];
          if (img) {
            try {
              doc.addImage(img, "JPEG", colFoto, y - 4, 12, 12);
            } catch {}
          }
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        if (mostrarCodigo) doc.text(p.codigo, colCodigo, y);

        const nombreTexto =
          p.nombre + (p.colores.length ? ` (${p.colores.join(", ")})` : "") + (mostrarRubro ? ` — ${p.categoriaNombre}` : "");
        const lineas = doc.splitTextToSize(nombreTexto, colPrecioX - colNombre - 25);
        doc.text(lineas, colNombre, y);

        let precioTexto = "";
        if (tipoPrecio === "mayorista") precioTexto = `$${formatearMoneda(p.precio_mayorista)}`;
        else if (tipoPrecio === "minorista") precioTexto = `$${formatearMoneda(p.precio_minorista)}`;
        else precioTexto = `$${formatearMoneda(p.precio_mayorista)} / $${formatearMoneda(p.precio_minorista)}`;
        doc.text(precioTexto, colPrecioX, y, { align: "right" });

        y += alturaFila;
      }
    } else {
      const colAncho = anchoUtil / 2 - 4;
      const alturaImagen = mostrarFoto ? colAncho * 0.75 : 0;
      const alturaTextoEstimada = 6 + (mostrarCodigo ? 4 : 0) + 8;
      const alturaFilaEstimada = alturaImagen + alturaTextoEstimada + 8;

      for (let i = 0; i < productosParaLista.length; i += 2) {
        if (y + alturaFilaEstimada > 280) {
          doc.addPage();
          y = 20;
        }

        const filaProductos = productosParaLista.slice(i, i + 2);
        let filaAlturaMax = 0;

        filaProductos.forEach((p, idx) => {
          const x = margen + idx * (colAncho + 8);
          const cardY = y;

          if (mostrarFoto) {
            const img = imagenesCache[p.id];
            if (img) {
              try {
                doc.addImage(img, "JPEG", x, cardY, colAncho, alturaImagen);
              } catch {}
            } else {
              doc.setFillColor(245, 245, 245);
              doc.rect(x, cardY, colAncho, alturaImagen, "F");
              doc.setFont("helvetica", "normal");
              doc.setFontSize(7);
              doc.setTextColor(190, 190, 190);
              doc.text("Sin foto", x + colAncho / 2, cardY + alturaImagen / 2, { align: "center" });
            }
          }

          let textoY = cardY + (mostrarFoto ? alturaImagen + 5 : 5);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(30, 30, 30);
          doc.text(doc.splitTextToSize(p.nombre, colAncho), x, textoY);
          textoY += 5;
          if (p.colores.length) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text(p.colores.join(", "), x, textoY);
            textoY += 4;
          }
          if (mostrarCodigo) {
            doc.setFontSize(7);
            doc.text(p.codigo, x, textoY);
            textoY += 4;
          }
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(124, 58, 237);
          let precioTexto = "";
          if (tipoPrecio === "mayorista") precioTexto = `May: $${formatearMoneda(p.precio_mayorista)}`;
          else if (tipoPrecio === "minorista") precioTexto = `Min: $${formatearMoneda(p.precio_minorista)}`;
          else precioTexto = `May: $${formatearMoneda(p.precio_mayorista)}  Min: $${formatearMoneda(p.precio_minorista)}`;
          doc.text(precioTexto, x, textoY);
          textoY += 6;

          filaAlturaMax = Math.max(filaAlturaMax, textoY - cardY);
        });

        y += filaAlturaMax + 4;
      }
    }

    return doc;
  }

  async function descargarPDF() {
    setGenerandoPDF(true);
    const doc = await construirPDF();
    setGenerandoPDF(false);
    const nombreArchivo = (titulo || "lista-precios-wizer").toLowerCase().replace(/\s+/g, "-");
    doc.save(`${nombreArchivo}.pdf`);
  }

  async function compartirPDF() {
    setGenerandoPDF(true);
    const doc = await construirPDF();
    setGenerandoPDF(false);
    const blob = doc.output("blob");
    const file = new File([blob], "lista-precios-wizer.pdf", { type: "application/pdf" });

    if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
      await (navigator as any).share({ files: [file], title: titulo });
    } else {
      doc.save("lista-precios-wizer.pdf");
      alert("Tu navegador no admite compartir directo — se descargó el PDF para que lo compartas manualmente.");
    }
  }

  if (cargando) return <p className="text-sm text-neutral-400">Cargando catálogo...</p>;

  return (
    <div className="space-y-6">
      {vistaPrevia ? (
        <div>
          <div className="no-print mb-4 flex items-center justify-between">
            <button onClick={() => setVistaPrevia(false)} className="text-xs text-neutral-400 hover:underline">
              ← Volver a editar
            </button>
            <div className="flex gap-2">
              <BotonImprimir />
              <button onClick={descargarPDF} disabled={generandoPDF} className="btn-secondary">
                {generandoPDF ? "Generando..." : "⬇️ Generar PDF"}
              </button>
              <button onClick={compartirPDF} disabled={generandoPDF} className="btn-primary">
                {generandoPDF ? "..." : "📤 Compartir"}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="mb-6 border-b border-neutral-100 pb-4">
              <p className="text-xl font-bold text-violet-700">WIZER BIKES</p>
              <p className="text-lg font-semibold">{titulo || "Lista de precios Wizer"}</p>
              <p className="text-xs text-neutral-400">Precios actualizados al: {new Date().toLocaleDateString("es-AR")}</p>
            </div>

            {presentacion === "lista" ? (
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-100 text-left text-neutral-500">
                  <tr>
                    {mostrarFoto && <th className="py-2">Foto</th>}
                    {mostrarCodigo && <th className="py-2">Código</th>}
                    <th className="py-2">Producto</th>
                    {mostrarRubro && <th className="py-2">Rubro</th>}
                    {(tipoPrecio === "mayorista" || tipoPrecio === "ambos") && <th className="py-2 text-right">Mayorista</th>}
                    {(tipoPrecio === "minorista" || tipoPrecio === "ambos") && <th className="py-2 text-right">Minorista</th>}
                  </tr>
                </thead>
                <tbody>
                  {productosParaLista.map((p) => (
                    <tr key={p.id} className="border-b border-neutral-50">
                      {mostrarFoto && (
                        <td className="py-2">
                          {p.foto_url ? (
                            <img src={p.foto_url} alt="" className="h-10 w-10 rounded object-cover" />
                          ) : (
                            <span className="text-neutral-300">—</span>
                          )}
                        </td>
                      )}
                      {mostrarCodigo && <td className="py-2 font-mono text-xs">{p.codigo}</td>}
                      <td className="py-2 font-medium">
                        {p.nombre}
                        {p.colores.length > 0 && <span className="text-neutral-500"> ({p.colores.join(", ")})</span>}
                      </td>
                      {mostrarRubro && <td className="py-2 text-neutral-500">{p.categoriaNombre}</td>}
                      {(tipoPrecio === "mayorista" || tipoPrecio === "ambos") && (
                        <td className="py-2 text-right">${formatearMoneda(p.precio_mayorista)}</td>
                      )}
                      {(tipoPrecio === "minorista" || tipoPrecio === "ambos") && (
                        <td className="py-2 text-right">${formatearMoneda(p.precio_minorista)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {productosParaLista.map((p) => (
                  <div key={p.id} className="rounded-lg border border-neutral-100 p-3">
                    {mostrarFoto &&
                      (p.foto_url ? (
                        <img src={p.foto_url} alt="" className="mb-2 h-28 w-full rounded object-cover" />
                      ) : (
                        <div className="mb-2 flex h-28 w-full items-center justify-center rounded bg-neutral-50 text-xs text-neutral-300">
                          Sin foto
                        </div>
                      ))}
                    <p className="text-sm font-medium">{p.nombre}</p>
                    {p.colores.length > 0 && <p className="text-xs text-neutral-500">{p.colores.join(", ")}</p>}
                    {mostrarCodigo && <p className="font-mono text-xs text-neutral-400">{p.codigo}</p>}
                    {mostrarRubro && <p className="text-xs text-neutral-400">{p.categoriaNombre}</p>}
                    <div className="mt-1 text-sm font-semibold text-violet-700">
                      {(tipoPrecio === "mayorista" || tipoPrecio === "ambos") && <p>May: ${formatearMoneda(p.precio_mayorista)}</p>}
                      {(tipoPrecio === "minorista" || tipoPrecio === "ambos") && <p>Min: ${formatearMoneda(p.precio_minorista)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {productosParaLista.length === 0 && (
              <p className="py-8 text-center text-neutral-400">No hay productos seleccionados.</p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-500">Mis listas</p>
              <button onClick={guardarComoNueva} disabled={guardandoLista} className="text-xs font-medium text-violet-600 hover:underline">
                {guardandoLista ? "Guardando..." : "💾 Guardar esta configuración"}
              </button>
            </div>
            {misListas.length === 0 ? (
              <p className="text-sm text-neutral-400">
                Todavía no guardaste ninguna. Armá los filtros de abajo y tocá "Guardar esta configuración".
              </p>
            ) : (
              <div className="space-y-2">
                {misListas.map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                    <span className="text-sm font-medium">{l.nombre}</span>
                    <div className="flex gap-3 text-xs">
                      <button onClick={() => cargarLista(l)} className="font-medium text-violet-600 hover:underline">
                        cargar
                      </button>
                      <button onClick={() => duplicarLista(l)} className="text-neutral-500 hover:underline">
                        duplicar
                      </button>
                      <button onClick={() => eliminarLista(l.id)} className="text-red-500 hover:underline">
                        eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <p className="mb-3 text-sm font-medium text-neutral-500">Tipo de precio</p>
            <div className="flex gap-4 text-sm">
              {(["mayorista", "minorista", "ambos"] as TipoPrecioLista[]).map((t) => (
                <label key={t} className="flex items-center gap-2">
                  <input type="radio" checked={tipoPrecio === t} onChange={() => setTipoPrecio(t)} />
                  <span className="capitalize">{t}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="card">
            <p className="mb-3 text-sm font-medium text-neutral-500">Rubros</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRubrosSel(new Set())}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  rubrosSel.size === 0 ? "bg-violet-600 text-white" : "bg-neutral-100 text-neutral-600"
                }`}
              >
                Todos
              </button>
              {categorias.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleRubro(c.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    rubrosSel.has(c.id) ? "bg-violet-600 text-white" : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          </div>

          <div className="card space-y-3">
            <label>
              <span className="mb-1 block text-sm font-medium">Buscar producto</span>
              <input
                className="input"
                placeholder="Nombre o código..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={soloActivos} onChange={() => setSoloActivos(true)} />
                Solo productos activos
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={!soloActivos} onChange={() => setSoloActivos(false)} />
                Todos
              </label>
            </div>
          </div>

          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-500">
                Productos ({resultadosFiltrados.length} resultados, {seleccionados.size} seleccionados en total)
              </p>
              <div className="flex gap-3">
                <button onClick={seleccionarTodosResultados} className="text-xs font-medium text-violet-600 hover:underline">
                  seleccionar todos
                </button>
                <button onClick={quitarTodosResultados} className="text-xs text-neutral-400 hover:underline">
                  quitar todos
                </button>
              </div>
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {resultadosFiltrados.map((p) => (
                <label key={p.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-neutral-50">
                  <input type="checkbox" checked={seleccionados.has(p.id)} onChange={() => toggleSeleccion(p.id)} />
                  <span className="flex-1">
                    {p.nombre} {p.colores.length > 0 && <span className="text-neutral-400">({p.colores.join(", ")})</span>}
                  </span>
                  <span className="font-mono text-xs text-neutral-400">{p.codigo}</span>
                </label>
              ))}
              {resultadosFiltrados.length === 0 && <p className="py-4 text-center text-sm text-neutral-400">Sin resultados.</p>}
            </div>
          </div>

          <div className="card space-y-3">
            <p className="text-sm font-medium text-neutral-500">Presentación</p>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={presentacion === "lista"} onChange={() => setPresentacion("lista")} />
                Lista de precios (compacta)
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={presentacion === "catalogo"} onChange={() => setPresentacion("catalogo")} />
                Catálogo comercial (con fotos)
              </label>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={mostrarFoto} onChange={(e) => setMostrarFoto(e.target.checked)} />
                Mostrar foto
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={mostrarCodigo} onChange={(e) => setMostrarCodigo(e.target.checked)} />
                Mostrar código
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={mostrarRubro} onChange={(e) => setMostrarRubro(e.target.checked)} />
                Mostrar rubro
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs text-neutral-500">Ordenar por</span>
                <select className="input" value={orden} onChange={(e) => setOrden(e.target.value as Orden)}>
                  <option value="rubro_nombre">Rubro + Nombre</option>
                  <option value="nombre">Nombre</option>
                  <option value="codigo">Código</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs text-neutral-500">Título</span>
                <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Lista de precios Wizer" />
              </label>
            </div>
          </div>

          <button onClick={() => setVistaPrevia(true)} disabled={seleccionados.size === 0} className="btn-primary">
            Vista previa ({seleccionados.size} productos)
          </button>
        </>
      )}
    </div>
  );
}
