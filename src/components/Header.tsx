import { useState, useEffect } from "react";
import { Menu, X, Moon, Sun, LogOut, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { clearTrackingSession } from "@/hooks/useTracker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);
    
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleSignOutClick = () => {
    setShowSignOutDialog(true);
  };

  const handleSignOutConfirm = async () => {
    clearTrackingSession();
    await signOut();
    setShowSignOutDialog(false);
    navigate('/');
  };

  const handleJoinClick = () => {
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-50 py-2 sm:py-4">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 pill-nav px-4 sm:px-6">
          {/* Logo */}
          <div className="flex items-center min-w-0">
            <a href="/" className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-primary-foreground font-bold text-base sm:text-lg">P</span>
              </div>
              <span className="text-base sm:text-xl font-bold font-serif truncate">Perspective</span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <a href="/" className="text-sm font-medium hover:bg-muted/60 rounded-full px-4 py-2 transition-all">
              Home
            </a>
            <a href="/#articles" className="text-sm font-medium hover:bg-muted/60 rounded-full px-4 py-2 transition-all">
              Articles
            </a>
            <a href="/wellness" className="text-sm font-medium hover:bg-muted/60 rounded-full px-4 py-2 transition-all">
              Wellness
            </a>
            <a href="/travel" className="text-sm font-medium hover:bg-muted/60 rounded-full px-4 py-2 transition-all">
              Travel
            </a>
            <a href="/about" className="text-sm font-medium hover:bg-muted/60 rounded-full px-4 py-2 transition-all">
              About
            </a>
            <a href="/run-bot" className="text-sm font-medium hover:bg-muted/60 rounded-full px-4 py-2 transition-all">
              Bot
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-full hover:bg-muted/60 transition-all"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>

            <button
              onClick={() => navigate('/admin-login')}
              className="hidden sm:flex items-center gap-1.5 p-1.5 sm:p-2 rounded-full hover:bg-muted/60 transition-all"
              aria-label="Admin"
            >
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-xs font-medium hidden lg:inline">Admin</span>
            </button>
            
            {user ? (
              <Button 
                onClick={handleSignOutClick}
                className="hidden md:flex bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 py-2 hover:scale-105 transition-all gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            ) : (
              <Button 
                onClick={handleJoinClick}
                className="hidden md:flex bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-2 hover:scale-105 transition-all"
              >
                Join Now
              </Button>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-1.5 sm:p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-2 py-4 px-4 rounded-2xl bg-[hsl(var(--surface-elevated))] border border-border/50 animate-fade-in">
            <nav className="flex flex-col gap-3">
              <a href="/" className="text-sm font-medium hover:text-accent transition-colors">
                Home
              </a>
              <a href="/#articles" className="text-sm font-medium hover:text-accent transition-colors">
                Articles
              </a>
              <a href="/wellness" className="text-sm font-medium hover:text-accent transition-colors">
                Wellness
              </a>
              <a href="/travel" className="text-sm font-medium hover:text-accent transition-colors">
                Travel
              </a>
              <a href="/about" className="text-sm font-medium hover:text-accent transition-colors">
                About
              </a>
              <a href="/run-bot" className="text-sm font-medium hover:text-accent transition-colors">
                Bot
              </a>
              <a href="/admin-login" className="text-sm font-medium hover:text-accent transition-colors flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                Admin
              </a>
              {user ? (
                <Button 
                  onClick={handleSignOutClick}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full w-full gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              ) : (
                <Button 
                  onClick={handleJoinClick}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full w-full"
                >
                  Join Now
                </Button>
              )}
            </nav>
          </div>
        )}
      </div>

      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOutConfirm}>
              Yes, Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
};

export default Header;
