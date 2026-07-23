"use client";

export default function BotonImprimir() {
  return (
    <button onClick={() => window.print()} className="btn-secondary no-print">
      🖨️ Imprimir listado
    </button>
  );
}
