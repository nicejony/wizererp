"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NuevoClientePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    empresa: "",
    cuit: "",
    whatsapp: "",
    email: "",
    provincia: "",
    localidad: "",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("clientes").insert({
      nombre: form.nombre,
      empresa: form.empresa || null,
      cuit: form.cuit || null,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      provincia: form.provincia || null,
      localidad: form.localidad || null,
    });

    setLoading(false);
    if (!error) router.push("/clientes");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Nuevo cliente</h1>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <label>
            <span className="mb-1 block text-sm font-medium">Nombre *</span>
            <input required className="input" value={form.nombre} onChange={(e) => update("nombre", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Empresa</span>
            <input className="input" value={form.empresa} onChange={(e) => update("empresa", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">CUIT</span>
            <input className="input" value={form.cuit} onChange={(e) => update("cuit", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">WhatsApp</span>
            <input className="input" value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Email</span>
            <input type="email" className="input" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Provincia</span>
            <input className="input" value={form.provincia} onChange={(e) => update("provincia", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Localidad</span>
            <input className="input" value={form.localidad} onChange={(e) => update("localidad", e.target.value)} />
          </label>
        </div>

        <button disabled={loading} className="btn-primary">
          {loading ? "Guardando..." : "Guardar cliente"}
        </button>
      </form>
    </div>
  );
}
