import jsPDF from "jspdf";

const MARGEN = 15;
const ANCHO = 210 - MARGEN * 2;
const DERECHA = MARGEN + ANCHO;

// Lista de compra a un proveedor: casillero para tildar, código, producto y cantidad
export function construirPDFOrdenCompra(p: {
  numero?: number | string | null;
  fecha: string;
  proveedor: string;
  items: { codigo: string; nombre: string; cantidad: number }[];
  observaciones?: string | null;
}): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(124, 58, 237);
  doc.text("WIZER BIKES", MARGEN, 20);

  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(`ORDEN DE COMPRA${p.numero ? ` N° ${p.numero}` : ""}`, MARGEN, 27);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Lista de compra a proveedor", MARGEN, 32);
  doc.text(String(p.fecha ?? ""), DERECHA, 20, { align: "right" });

  doc.setDrawColor(220, 220, 220);
  doc.line(MARGEN, 36, DERECHA, 36);

  let y = 46;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Proveedor", MARGEN, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(p.proveedor, MARGEN, y);
  y += 10;

  const cCaja = MARGEN;
  const cCodigo = MARGEN + 9;
  const cProducto = MARGEN + 36;
  const cCant = DERECHA;

  function encabezadoTabla() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text("Código", cCodigo, y);
    doc.text("Producto", cProducto, y);
    doc.text("Cant.", cCant, y, { align: "right" });
    y += 2;
    doc.setDrawColor(220, 220, 220);
    doc.line(MARGEN, y, DERECHA, y);
    y += 6;
  }
  encabezadoTabla();

  let unidades = 0;
  for (const it of p.items) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lineas = doc.splitTextToSize(it.nombre, 118);
    const alto = Math.max(8, lineas.length * 4.8 + 3);
    if (y + alto > 275) {
      doc.addPage();
      y = 20;
      encabezadoTabla();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }
    doc.setDrawColor(150, 150, 150);
    doc.rect(cCaja, y - 3.6, 4, 4);
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(9);
    doc.text(it.codigo, cCodigo, y);
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(lineas, cProducto, y);
    doc.setFont("helvetica", "bold");
    doc.text(String(it.cantidad), cCant, y, { align: "right" });
    unidades += Number(it.cantidad) || 0;
    y += alto;
  }

  if (y + 22 > 285) {
    doc.addPage();
    y = 20;
  }
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGEN, y - 2, DERECHA, y - 2);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`${p.items.length} artículo(s) — ${unidades} unidades`, DERECHA, y, { align: "right" });
  y += 9;

  if (p.observaciones) {
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
