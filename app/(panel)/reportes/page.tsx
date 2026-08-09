import ReportesPanel from "@/components/ReportesPanel";
import { BarChart3 } from "lucide-react";

export default function ReportesPage() {
  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold">
        <BarChart3 className="text-violet-600" size={22} /> Reportes
      </h1>
      <ReportesPanel />
    </div>
  );
}

