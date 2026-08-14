"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { subirFotoProducto, borrarFotoProducto } from "@/lib/fotosProductos";

export default function FotoProductoUploader({
  productoId,
  fotoUrlInicial,
}: {
  productoId: string;
  fotoUrlInicial: string | null;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fotoUrl, setFotoUrl] = useState(fotoUrlInicial);
  const [subiendo, setSubiendo] = useState(false);

  async function manejarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendo(true);
    const nuevaUrl = await subirFotoProducto(productoId, file);
    if (nuevaUrl) {
      await supabase.from("productos").update({ foto_url: nuevaUrl }).eq("id", productoId);
      setFotoUrl(nuevaUrl);
    }
    setSubiendo(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function borrar() {
    if (!fotoUrl || !confirm("¿Sacar la foto de este producto?")) return;
    setSubiendo(true);
    await borrarFotoProducto(fotoUrl);
    await supabase.from("productos").update({ foto_url: null }).eq("id", productoId);
    setFotoUrl(null);
    setSubiendo(false);
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-medium">Foto principal</span>
      <div className="flex items-center gap-4">
        {fotoUrl ? (
          <img src={fotoUrl} alt="Foto del producto" className="h-20 w-20 rounded-lg border border-neutral-100 object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-neutral-200 text-xs text-neutral-400">
            Sin foto
          </div>
        )}
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            className="btn-secondary text-xs"
          >
            {subiendo ? "..." : fotoUrl ? "Cambiar foto" : "Subir foto"}
          </button>
          {fotoUrl && (
            <button type="button" onClick={borrar} disabled={subiendo} className="text-xs text-red-600 hover:underline">
              Sacar foto
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={manejarArchivo} className="hidden" />
      </div>
    </div>
  );
}
