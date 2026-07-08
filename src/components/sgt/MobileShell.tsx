import { Link, useLocation } from "@tanstack/react-router";
import { Home, MapPin, Search, ClipboardList, User } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileShellProps {
  children: ReactNode;
  hideTopBar?: boolean;
  topTitle?: string;
}

const navItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/explorar", label: "Explorar", icon: Search },
  { to: "/mapa", label: "Mapa", icon: MapPin },
  { to: "/agendamentos", label: "Pedidos", icon: ClipboardList },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function MobileShell({ children }: MobileShellProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
        <main className="flex-1 pb-24">{children}</main>

        <nav className="fixed inset-x-0 bottom-3 z-40 mx-auto flex max-w-[22rem] items-center justify-between rounded-full border border-white/5 bg-black/70 px-5 py-3 shadow-elegant backdrop-blur-xl">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 text-[10px] font-medium transition",
                  active ? "text-primary" : "text-muted-foreground hover:text-white",
                )}
              >
                <Icon
                  className={cn("h-5 w-5", active && "stroke-[2.5]")}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
