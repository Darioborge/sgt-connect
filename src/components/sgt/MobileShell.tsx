import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, MessageCircle, User, Bell, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileShellProps {
  children: ReactNode;
  hideTopBar?: boolean;
  topTitle?: string;
}

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explorar", label: "Search", icon: Search },
<<<<<<< Updated upstream
=======
  { to: "/publicar", label: "Publish", icon: PlusSquare, isFab: true },
>>>>>>> Stashed changes
  { to: "/chat", label: "Message", icon: MessageCircle },
  { to: "/perfil", label: "Profile", icon: User },
] as const;

export function MobileShell({ children, hideTopBar, topTitle = "Discover" }: MobileShellProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
<<<<<<< Updated upstream
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col bg-background">
        {!hideTopBar && (
          <header className="sticky top-0 z-30 flex items-center justify-between bg-background/85 px-5 pb-3 pt-4 backdrop-blur-md">
            <h1 className="flex items-baseline gap-2 text-2xl font-semibold tracking-tight">
              <span className="text-foreground">{topTitle}</span>
              <span className="text-primary">Núpublico</span>
            </h1>
            <div className="flex items-center gap-2">
              <Link
                to="/explorar"
                aria-label="Procurar"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground transition hover:bg-secondary"
              >
                <Search className="h-[18px] w-[18px]" />
              </Link>
              <Link
                to="/chat"
                aria-label="Notificações"
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
              </Link>
            </div>
          </header>
        )}

        <main className="flex-1 pb-28">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md">
          <div className="relative mx-3 mb-3 rounded-3xl border border-border/40 bg-card/95 px-3 py-2.5 backdrop-blur-xl" style={{ boxShadow: "var(--shadow-elegant)" }}>
            <div className="grid grid-cols-5 items-center">
              {navItems.slice(0, 2).map((item) => (
                <NavLink key={item.to} item={item} active={location.pathname === item.to} />
              ))}

              <div className="flex justify-center">
                <Link
                  to="/publicar"
                  aria-label="Publicar"
                  className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full text-primary-foreground ring-4 ring-background"
                  style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
                >
                  <Plus className="h-6 w-6" strokeWidth={2.5} />
                </Link>
              </div>

              {navItems.slice(2).map((item) => (
                <NavLink key={item.to} item={item} active={location.pathname.startsWith(item.to)} />
              ))}
            </div>
          </div>
=======
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
>>>>>>> Stashed changes
        </nav>
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
}: {
  item: { to: string; label: string; icon: typeof Home };
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-medium transition",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 1.8} />
      <span className={cn(active && "font-semibold")}>{item.label}</span>
    </Link>
  );
}
