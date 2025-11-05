import React from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Sun, LogOut, User } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import namsaLogo from '@/assets/namsa-logo.png';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface HeaderProps {
  title: string;
  showUserMenu?: boolean;
  bigLogo?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, showUserMenu = true, bigLogo = false }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const roleLabel = user?.role ? user.role.toLowerCase().replace(/_/g, ' ') : null;

  const getAvatarUrl = () => {
    // Only load avatar if we have a token; otherwise avoid 403 noise
    const token = localStorage.getItem('token');
    if (token && user?.role === 'ARTIST') {
      return `https://api.owellgraphics.com/api/passportphoto/user/${user.id}`;
    }
    return undefined;
  };

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'NA';
  };

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border/80 bg-background/70 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="flex h-full items-center justify-between gap-3 px-3 sm:px-6">
        {/* Mobile trigger + Title */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <SidebarTrigger className="md:hidden h-10 w-10 rounded-lg border border-border/70 bg-card/80 text-foreground shadow-sm hover:bg-accent/10 hover:text-accent-foreground transition-colors" />
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src={namsaLogo}
              alt="NAMSA"
              className={`${bigLogo ? 'h-14 sm:h-20' : 'h-10 sm:h-12'} w-auto object-contain drop-shadow-sm`}
            />
            <div className="min-w-0 leading-tight">
              {roleLabel && (
                <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground/80 sm:hidden">
                  {`${roleLabel} portal`}
                </span>
              )}
              <h1 className="text-base font-semibold text-foreground animate-fade-in truncate sm:text-xl sm:font-bold">
                {title}
              </h1>
            </div>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Theme Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-full border-border/70 bg-card/80 text-foreground hover:bg-accent/10 hover:text-accent-foreground transition-colors hover-scale"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          {showUserMenu && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full border border-border/60 bg-card/80 hover:bg-muted/60 transition-colors hover-scale"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={getAvatarUrl()}
                      alt={user.email}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <AvatarFallback className="bg-gradient-namsa text-primary-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 animate-scale-in" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">{user.email}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.role.toLowerCase()} account
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;