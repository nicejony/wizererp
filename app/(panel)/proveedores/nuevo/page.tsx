"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NuevoProveedorPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    contacto: "",
    telefono: "",
    email: "",
    pais: "",
    observaciones: "",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("proveedores").insert({
      nombre: form.nombre,
      contacto: form.contacto || null,
      telefono: form.telefono || null,
      email: form.email || null,
      pais: form.pais || null,
      observaciones: form.observaciones || null,
    });

    setLoading(false);
    if (!error) router.push("/proveedores");
    else alert("Error al guardar: " + error.message);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Nuevo proveedor</h1>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-medium">Nombre *</span>
            <input required className="input" value={form.nombre} onChange={(e) => update("nombre", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Contacto</span>
            <input className="input" value={form.contacto} onChange={(e) => update("contacto", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Teléfono</span>
            <input className="input" value={form.telefono} onChange={(e) => update("telefono", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Email</span>
            <input type="email" className="input" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">País</span>
            <input className="input" value={form.pais} onChange={(e) => update("pais", e.target.value)} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Observaciones</span>
          <textarea className="input" rows={2} value={form.observaciones} onChange={(e) => update("observaciones", e.target.value)} />
        </label>

        <button disabled={loading} className="btn-primary">
          {loading ? "Guardando..." : "Guardar proveedor"}
        </button>
      </form>
    </div>
  );
}
