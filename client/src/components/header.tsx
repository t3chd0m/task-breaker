import { Link, useLocation } from "wouter";
import { Sun, Moon, LogOut, User, Zap, Clock } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 40 40" fill="none" aria-label="Task Breaker">
      <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity="0.3"/>
      <circle cx="28" cy="12" r="6" fill="currentColor" opacity="0.9"/>
      <circle cx="12" cy="28" r="5" stroke="currentColor" strokeWidth="2" opacity="0.6"/>
      <circle cx="28" cy="28" r="4" fill="currentColor" opacity="0.4"/>
    </svg>
  );
}

export { Logo };

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, logoutPending } = useAuth();
  const [location] = useLocation();

  return (
    <>
      {/* Desktop + Mobile top header */}
      <header
        className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md"
        role="banner"
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          {/* Left: Logo + Name */}
          <Link href="/" aria-label="Go to home page">
            <div className="flex items-center gap-2 text-primary" data-testid="link-home-logo">
              <Logo />
              <span className="font-display text-lg font-bold tracking-tight">
                Task Breaker
              </span>
            </div>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            <Link href="/">
              <Button
                variant={location === "/" ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
                data-testid="nav-home"
                aria-label="Home"
              >
                <Zap className="h-4 w-4" />
                Home
              </Button>
            </Link>
            <Link href="/history">
              <Button
                variant={location === "/history" ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
                data-testid="nav-history"
                aria-label="History"
              >
                <Clock className="h-4 w-4" />
                History
              </Button>
            </Link>
          </nav>

          {/* Right: theme toggle + user menu */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              data-testid="button-theme-toggle"
              className="h-9 w-9"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    data-testid="button-user-menu"
                    aria-label="User menu"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline max-w-[120px] truncate">
                      {user.username}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="text-muted-foreground text-sm" disabled>
                    Signed in as {user.username}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => logout()}
                    disabled={logoutPending}
                    data-testid="button-logout"
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {logoutPending ? "Logging out..." : "Log out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation bar */}
      {user && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/90 backdrop-blur-md"
          aria-label="Mobile navigation"
        >
          <div className="flex items-center justify-around h-14">
            <Link href="/">
              <button
                className={`flex flex-col items-center gap-0.5 px-6 py-2 min-h-[48px] min-w-[48px] rounded-lg transition-colors ${
                  location === "/"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
                data-testid="mobile-nav-home"
                aria-label="Home"
              >
                <Zap className="h-5 w-5" />
                <span className="text-xs font-medium">Home</span>
              </button>
            </Link>
            <Link href="/history">
              <button
                className={`flex flex-col items-center gap-0.5 px-6 py-2 min-h-[48px] min-w-[48px] rounded-lg transition-colors ${
                  location === "/history"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
                data-testid="mobile-nav-history"
                aria-label="History"
              >
                <Clock className="h-5 w-5" />
                <span className="text-xs font-medium">History</span>
              </button>
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}
