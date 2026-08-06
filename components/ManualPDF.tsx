"use client";

import jsPDF from "jspdf";

interface Seccion {
  titulo: string;
  parrafos: string[];
}

const MANUAL: Seccion[] = [
  {
    titulo: "Dashboard",
    parrafos: [
      "Es la pantalla de inicio. Muestra un resumen rápido: ventas de hoy, ventas del mes, presupuestos pendientes de convertir, y alertas de productos con stock bajo.",
      "Sirve para tener una foto del negocio sin entrar a ningún módulo en particular.",
    ],
  },
  {
    titulo: "Presupuestos",
    parrafos: [
      "Es el primer paso de una venta. Se elige el cliente, se agregan productos (con su cantidad, lista de precio y descuento) y se guarda.",
      "Un presupuesto no descuenta stock todavía — es solo una propuesta. Desde el detalle de un presupuesto se puede editar mientras no se haya convertido, y convertirlo a Remito cuando el cliente confirma.",
    ],
  },
  {
    titulo: "Remitos",
    parrafos: [
      "Es el documento de traslado de mercadería (no es una factura). Se genera al convertir un presupuesto confirmado.",
      "Al confirmarse el Remito, ahí sí se descuenta el stock del depósito Principal. Muestra los datos completos del cliente (dirección, CUIT, condición de IVA), y permite editar cantidad/descripción y agregar bultos y transportista solo para lo que se imprime — sin afectar el stock ya descontado ni la Venta posterior.",
      "Desde acá también se puede imprimir el 'cartel de expreso' para pegar en el bulto.",
    ],
  },
  {
    titulo: "Ventas",
    parrafos: [
      "Es el registro final de la operación, para estadísticas y cálculo de margen. Se genera al convertir un Remito.",
      "Siempre refleja los datos originales del presupuesto (precios, cantidades), sin importar qué se haya editado en el Remito para el papel.",
      "Desde una Venta confirmada se puede generar una Devolución.",
    ],
  },
  {
    titulo: "Devoluciones",
    parrafos: [
      "Se generan desde una Venta ya confirmada, cuando un cliente devuelve mercadería (total o parcial).",
      "Al confirmar la devolución, el stock devuelto vuelve a entrar automáticamente al depósito Principal.",
    ],
  },
  {
    titulo: "Clientes",
    parrafos: [
      "Listado y ficha de cada cliente: datos de contacto, dirección, CUIT, condición de IVA, expreso habitual y observaciones.",
      "Desde la ficha del cliente también se puede imprimir el cartel de expreso en cualquier momento, sin depender de un remito.",
    ],
  },
  {
    titulo: "Productos",
    parrafos: [
      "Catálogo de productos, cada uno con sus colores (variantes), costo, precios (mayorista/minorista) y moneda (pesos o dólares).",
      "Se puede cargar producto por producto, o importar muchos de una vez con la opción 'Importar Excel' (se descarga una plantilla, se completa y se sube).",
    ],
  },
  {
    titulo: "Stock",
    parrafos: [
      "Muestra cuánto stock hay de cada producto, desglosado por depósito. Permite crear depósitos nuevos y hacer transferencias de mercadería entre ellos.",
      "También incluye Inventario: un conteo físico que compara lo que dice el sistema contra lo contado a mano, y ajusta automáticamente las diferencias.",
    ],
  },
  {
    titulo: "Compras",
    parrafos: [
      "Registro de compras a proveedores. Al confirmar una compra, el stock ingresa automáticamente al depósito elegido, y se genera un cargo en la cuenta corriente del proveedor.",
    ],
  },
  {
    titulo: "Proveedores",
    parrafos: ["Listado de proveedores con sus datos de contacto, usados al cargar una Compra."],
  },
  {
    titulo: "Cuentas Corrientes",
    parrafos: [
      "Muestra el saldo de cada cliente y proveedor: cuánto te deben y cuánto debés vos, con el total sumado arriba de todo.",
      "Las ventas a 'Cuenta Corriente' y las compras generan cargos automáticos. Los pagos y cobros se registran a mano con el botón correspondiente. Cada cuenta tiene una ficha imprimible con el historial completo.",
    ],
  },
  {
    titulo: "Administración",
    parrafos: [
      "Cajas y bancos, con su saldo. Las ventas en efectivo entran solas a la Caja Principal. Los gastos y otros ingresos se cargan a mano.",
    ],
  },
  {
    titulo: "Reportes",
    parrafos: [
      "Ventas, margen y unidades vendidas filtradas por fecha. Ranking de productos más vendidos, valor de stock total y por artículo, y qué productos tienen stock pero no se vendieron en el período.",
    ],
  },
  {
    titulo: "Configuración",
    parrafos: [
      "Usuarios y sus roles, categorías y marcas, tipo de cambio del dólar (usado para convertir a pesos los productos cargados en USD), backup completo del sistema, y este manual.",
    ],
  },
];

export default function ManualPDF() {
  function generarManual() {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margen = 20;
    const anchoUtil = 210 - margen * 2;
    let y = 25;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(124, 58, 237); // violeta
    doc.text("WIZER ERP", margen, y);
    y += 8;
    doc.setFontSize(13);
    doc.setTextColor(80, 80, 80);
    doc.text("Manual de uso", margen, y);
    y += 6;
    doc.setFontSize(9);
    doc.text(`Generado el ${new Date().toLocaleDateString("es-AR")}`, margen, y);
    y += 12;

    for (const seccion of MANUAL) {
      // Salto de página si no entra el título + primer párrafo
      if (y > 260) {
        doc.addPage();
        y = 25;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(30, 30, 30);
      doc.text(seccion.titulo, margen, y);
      y += 2;
      doc.setDrawColor(124, 58, 237);
      doc.setLineWidth(0.5);
      doc.line(margen, y, margen + anchoUtil, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(60, 60, 60);

      for (const parrafo of seccion.parrafos) {
        const lineas = doc.splitTextToSize(parrafo, anchoUtil);
        if (y + lineas.length * 5 > 280) {
          doc.addPage();
          y = 25;
        }
        doc.text(lineas, margen, y);
        y += lineas.length * 5 + 4;
      }

      y += 4;
    }

    doc.save("wizer-erp-manual-de-uso.pdf");
  }

  return (
    <div className="card">
      <p className="mb-1 text-sm font-medium text-neutral-500">Manual de uso</p>
      <p className="mb-4 text-sm text-neutral-500">
        Un PDF con una explicación simple de qué hace y para qué sirve cada módulo del sistema.
      </p>
      <button onClick={generarManual} className="btn-primary">
        📄 Descargar manual (PDF)
      </button>
    </div>
  );
}