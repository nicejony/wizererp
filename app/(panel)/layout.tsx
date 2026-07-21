import Sidebar from "@/components/Sidebar";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-neutral-50 p-8">{children}</main>
    </div>
  );
}
