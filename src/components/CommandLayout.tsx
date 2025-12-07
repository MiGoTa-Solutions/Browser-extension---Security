import { ReactNode } from "react";

interface CommandLayoutProps {
  children: ReactNode;
}

export function CommandLayout({ children }: CommandLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
