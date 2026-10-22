"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RemitenteManager() {
  const supabase = createClient();
  const [id, setId] = useState<string | null>(null);
  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    supabase
      .from("remitente")
      .select("*")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setId(data.id);
          setRazonSocial(data.razon_social ?? "");
          setCuit(data.cuit ?? "");
          setDireccion(data.direccion ?? "");
          setTelefono(data.telefono ?? "");
        }
        setCargando(false);
      });
  }, []);

  async function guardar() {
    if (!id) return;
    setGuardando(true);
    const { error } = await supabase
      .from("remitente")
      .update({
        razon_social: razonSocial || null,
        cuit: cuit || null,
        direccion: direccion || null,
        telefono: telefono || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    setGuardando(false);
    if (error) alert("Error al guardar: " + error.message);
  }

  if (cargando) return null;

  return (
    <div className="card space-y-4">
      <p className="text-sm font-medium text-neutral-500">Datos del remitente</p>
      <p className="text-xs text-neutral-400">
        Aparecen en el Remito y en el cartel de expreso, para identificar quién envía el paquete.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium">Razón social / Nombre</span>
          <input className="input" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">CUIT / Documento</span>
          <input className="input" value={cuit} onChange={(e) => setCuit(e.target.value)} />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">Dirección</span>
          <input className="input" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Teléfono</span>
          <input className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </label>
      </div>
      <button onClick={guardar} disabled={guardando} className="btn-primary">
        {guardando ? "Guardando..." : "Guardar remitente"}
      </button>
    </div>
  );
}
