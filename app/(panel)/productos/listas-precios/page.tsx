import ListasPreciosPanel from "@/components/ListasPreciosPanel";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

export default function ListasPreciosPage() {
  return (
    <div className="max-w-3xl">
      <Link href="/productos" className="text-xs text-neutral-400 hover:underline">
        ← Volver a Productos
      </Link>
      <h1 className="mb-6 mt-1 flex items-center gap-2 text-2xl font-semibold">
        <ClipboardList className="text-violet-600" size={22} /> Listas de Precios
      </h1>
      <ListasPreciosPanel />
    </div>
  );
}
