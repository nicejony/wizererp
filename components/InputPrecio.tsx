"use client";

import { useState } from "react";

// Campo de precio que deja escribir tranquilo: mientras lo editás muestra lo que tipeás, y al salir lo muestra con 2 decimales
export default function InputPrecio({
  valor,
  onCambio,
  deshabilitado,
  resaltar,
}: {
  valor: number;
  onCambio: (v: number) => void;
  deshabilitado?: boolean;
  resaltar?: boolean;
}) {
  const [texto, setTexto] = useState<string | null>(null);

  return (
    <input
      type="number"
      step="0.01"
      disabled={deshabilitado}
      placeholder={resaltar ? "cargar" : undefined}
      className={`input no-spinner py-1 disabled:bg-neutral-50 disabled:text-neutral-500 ${resaltar ? "border-amber-400" : ""}`}
      value={texto ?? (valor === 0 && resaltar ? "" : valor.toFixed(2))}
      onFocus={() => setTexto(valor === 0 ? "" : String(Number(valor.toFixed(4))))}
      onChange={(e) => {
        setTexto(e.target.value);
        onCambio(Number(e.target.value) || 0);
      }}
      onBlur={() => setTexto(null)}
    />
  );
}
