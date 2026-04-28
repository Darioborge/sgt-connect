import { Link, useLocation } from "@tanstack/react-router";
import { Home, MapPin, MessageCircle, User, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileShellProps {
  children: ReactNode;
  hideTopBar?: boolean;
  topTitle?: string;
}

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/mapa", label: "Mapa", icon: MapPin },
  { to: "/publicar", label: "Publish", icon: Plus, isFab: true },
  { to: "/chat", label: "Message", icon: MessageCircle },
  { to: "/perfil", label: "Profile", icon: User },
] as const;

export function MobileShell({ children, hideTopBar, topTitle = "Discover" }: MobileShellProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
        <main className="flex-1 pb-24">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-center justify-between bg-black/90 px-6 py-4 backdrop-blur-md pb-6 rounded-t-3xl">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
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
