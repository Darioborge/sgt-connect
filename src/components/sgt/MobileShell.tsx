import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, PlusSquare, MessageCircle, User, Sun, Moon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/sgt/ThemeProvider";

interface MobileShellProps {
  children: ReactNode;
  hideTopBar?: boolean;
}

const navItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/explorar", label: "Explorar", icon: Search },
  { to: "/publicar", label: "Publicar", icon: PlusSquare },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function MobileShell({ children, hideTopBar }: MobileShellProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col border-x border-border bg-background">
        {!hideTopBar && (
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
            <Link to="/" className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                Nú
              </div>
              <span className="text-lg font-semibold tracking-tight">
                Nú<span className="text-primary">público</span>
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="rounded-full p-2 text-foreground transition hover:bg-accent"
                aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <Link
                to="/chat"
                className="relative rounded-full p-2 text-foreground transition hover:bg-accent"
                aria-label="Mensagens"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
              </Link>
            </div>
          </header>
        )}

        <main className="flex-1 pb-20">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-center justify-around border-t border-border bg-background/95 px-2 py-2 backdrop-blur">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("h-6 w-6", active && "stroke-[2.4]")}
                  strokeWidth={active ? 2.4 : 1.8}
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
