import type { KioskShellProps } from './types';

export default function KioskShell({ children }: KioskShellProps) {
  return (
    <div className="dark fixed inset-0 flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      {children}
    </div>
  );
}
