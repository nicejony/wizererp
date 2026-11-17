import jsPDF from "jspdf";

const MARGEN = 15;
const ANCHO = 210 - MARGEN * 2;
const DERECHA = MARGEN + ANCHO;

// Abre el menú de compartir del celular (imprimir, WhatsApp, guardar...) o, si no existe, descarga el archivo
export async function guardarOCompartirPDF(doc: jsPDF, nombreArchivo: string, titulo: string) {
  const blob = doc.output("blob");
  const file = new File([blob], nombreArchivo, { type: "application/pdf" });
  const nav = navigator as any;

  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: titulo });
      return;
    } catch (e: any) {
      if (e?.name === "AbortError") return; // cerró el menú sin elegir nada
    }
  }
  doc.save(nombreArchivo);
}

function cabecera(doc: jsPDF, titulo: string, subtitulo: string, fecha: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(124, 58, 237);
  doc.text("WIZER BIKES", MARGEN, 20);

  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(titulo, MARGEN, 27);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  if (subtitulo) doc.text(subtitulo, MARGEN, 32);
  doc.text(String(fecha ?? ""), DERECHA, 20, { align: "right" });

  doc.setDrawColor(220, 220, 220);
  doc.line(MARGEN, 36, DERECHA, 36);
  return 44;
}

export interface ItemDocumentoPDF {
  codigo: string;
  nombre: string;
  cantidad: number;
  precio: string; // ya formateado con su moneda
  descuento: number;
  subtotal: string; // ya formateado con su moneda
}

// Presupuesto, Venta y Devolución (documentos con precios)
export function construirPDFDocumento(p: {
  titulo: string;
  subtitulo?: string;
  fecha: string;
  cliente: string;
  empresa?: string | null;
  telefono?: string | null;
  formaPago?: string | null;
  items: ItemDocumentoPDF[];
  total: string;
  observaciones?: string | null;
}): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = cabecera(doc, p.titulo, p.subtitulo ?? "", p.fecha);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Cliente", MARGEN, y);
  if (p.formaPago) doc.text("Forma de pago", DERECHA, y, { align: "right" });
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(p.cliente, MARGEN, y);
  if (p.formaPago) {
    doc.setFontSize(10);
    doc.text(p.formaPago, DERECHA, y, { align: "right" });
  }
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  if (p.empresa) {
    doc.text(p.empresa, MARGEN, y);
    y += 4.5;
  }
  if (p.telefono) {
    doc.text(p.telefono, MARGEN, y);
    y += 4.5;
  }
  y += 5;

  const cCodigo = MARGEN;
  const cProducto = MARGEN + 24;
  const cCant = 118;
  const cPrecio = 146;
  const cDesc = 163;
  const cSub = DERECHA;

  function encabezadoTabla() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text("Código", cCodigo, y);
    doc.text("Producto", cProducto, y);
    doc.text("Cant.", cCant, y, { align: "right" });
    doc.text("Precio", cPrecio, y, { align: "right" });
    doc.text("Desc.", cDesc, y, { align: "right" });
    doc.text("Subtotal", cSub, y, { align: "right" });
    y += 2;
    doc.setDrawColor(220, 220, 220);
    doc.line(MARGEN, y, DERECHA, y);
    y += 5;
  }
  encabezadoTabla();

  for (const it of p.items) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lineas = doc.splitTextToSize(it.nombre, 64);
    const alto = Math.max(7, lineas.length * 4.2 + 3);
    if (y + alto > 275) {
      doc.addPage();
      y = 20;
      encabezadoTabla();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    }
    doc.setTextColor(120, 120, 120);
    doc.text(it.codigo, cCodigo, y);
    doc.setTextColor(30, 30, 30);
    doc.text(lineas, cProducto, y);
    doc.text(String(it.cantidad), cCant, y, { align: "right" });
    doc.text(it.precio, cPrecio, y, { align: "right" });
    doc.setTextColor(120, 120, 120);
    doc.text(`${it.descuento}%`, cDesc, y, { align: "right" });
    doc.setTextColor(30, 30, 30);
    doc.text(it.subtotal, cSub, y, { align: "right" });
    y += alto;
  }

  if (y + 26 > 285) {
    doc.addPage();
    y = 20;
  }
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGEN + 100, y - 2, DERECHA, y - 2);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Total", DERECHA, y, { align: "right" });
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(124, 58, 237);
  doc.text(p.total, DERECHA, y, { align: "right" });
  y += 10;

  if (p.observaciones) {
    if (y + 14 > 285) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Observaciones", MARGEN, y);
    y += 4.5;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(doc.splitTextToSize(p.observaciones, ANCHO), MARGEN, y);
  }

  return doc;
}

// Remito: documento de traslado, sin precios
export function construirPDFRemito(p: {
  numero: string | number;
  fecha: string;
  remitente?: { razon_social: string | null; cuit: string | null; direccion: string | null; telefono: string | null } | null;
  cliente: { nombre: string; direccion: string; localidad: string; cuit: string; condicion_iva: string };
  condicionVenta: string;
  items: { cantidad: number; descripcion: string }[];
  bultos?: string | number | null;
  transportista?: string | null;
}): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = cabecera(doc, `REMITO N° ${p.numero}`, "Documento no válido como factura", p.fecha);

  const r = p.remitente;
  if (r && (r.razon_social || r.cuit || r.direccion || r.telefono)) {
    const detalle = [r.cuit ? `CUIT: ${r.cuit}` : "", r.direccion ?? "", r.telefono ? `Tel: ${r.telefono}` : ""]
      .filter(Boolean)
      .join(" — ");
    doc.setFillColor(247, 247, 247);
    doc.rect(MARGEN, y - 4, ANCHO, 17, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Remitente", MARGEN + 3, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(r.razon_social || "—", MARGEN + 3, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(doc.splitTextToSize(detalle || "—", ANCHO - 6), MARGEN + 3, y + 10);
    y += 21;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(`Señor/es: ${p.cliente.nombre}`, MARGEN, y);
  y += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Dirección: ${p.cliente.direccion} — Localidad: ${p.cliente.localidad}`, MARGEN, y);
  y += 4.5;
  doc.text(`CUIT: ${p.cliente.cuit} — IVA: ${p.cliente.condicion_iva} — Condición de venta: ${p.condicionVenta}`, MARGEN, y);
  y += 9;

  function encabezadoTabla() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text("Cant.", MARGEN + 12, y, { align: "right" });
    doc.text("Descripción", MARGEN + 20, y);
    y += 2;
    doc.setDrawColor(220, 220, 220);
    doc.line(MARGEN, y, DERECHA, y);
    y += 5;
  }
  encabezadoTabla();

  for (const it of p.items) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lineas = doc.splitTextToSize(it.descripcion, ANCHO - 20);
    const alto = Math.max(7, lineas.length * 4.6 + 3);
    if (y + alto > 270) {
      doc.addPage();
      y = 20;
      encabezadoTabla();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }
    doc.setTextColor(30, 30, 30);
    doc.text(String(it.cantidad), MARGEN + 12, y, { align: "right" });
    doc.text(lineas, MARGEN + 20, y);
    y += alto;
  }

  if (y + 22 > 285) {
    doc.addPage();
    y = 20;
  }
  y += 3;
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGEN, y, DERECHA, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`Cantidad de bultos: ${p.bultos === null || p.bultos === undefined || p.bultos === "" ? "—" : p.bultos}`, MARGEN, y);
  y += 6;
  doc.text(`Transportista: ${p.transportista || "—"}`, MARGEN, y);

  return doc;
}
