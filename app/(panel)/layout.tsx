import Sidebar from "@/components/Sidebar";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-neutral-50 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
