import { Link, useLocation } from "@tanstack/react-router";
import { MapPin, MessageCircle, User, Plus, CircleDot } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileShellProps {
  children: ReactNode;
  hideTopBar?: boolean;
  topTitle?: string;
}

const navItems = [
  { to: "/chat", label: "Mensagens", icon: MessageCircle },
  { to: "/estados", label: "Estados", icon: CircleDot },
  { to: "/publicar", label: "Publicar", icon: Plus, isFab: true },
  { to: "/mapa", label: "Mapa", icon: MapPin },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function MobileShell({ children, hideTopBar, topTitle = "Discover" }: MobileShellProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
        <main className="flex-1 pb-24">{children}</main>

        <nav className="fixed inset-x-0 bottom-3 z-40 mx-auto flex max-w-[22rem] items-center justify-between rounded-full border border-white/5 bg-black/70 px-5 py-3 shadow-elegant backdrop-blur-xl">
          {navItems.map((item) => {
            const active = item.to === "/chat"
              ? location.pathname === "/chat" || location.pathname.startsWith("/chat/")
              : location.pathname === item.to;
            const Icon = item.icon;
            
            if ("isFab" in item && item.isFab) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex -translate-y-6 items-center justify-center rounded-full bg-primary p-4 text-white shadow-lg shadow-primary/30 transition hover:scale-105"
                >
                  <Icon className="h-6 w-6" strokeWidth={2.5} />
                </Link>
              );
            }

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
