import { Search, LogOut, User, Settings, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';

interface DashboardHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function DashboardHeader({ searchQuery, onSearchChange }: DashboardHeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b bg-card shadow-sm h-16">
      <div className="flex items-center justify-between px-6 h-full">
        <div className="flex-1 max-w-2xl">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
            <Input
              type="search"
              placeholder="Search files with AI-powered semantic search..."
              className="pl-10 h-11 bg-background/50 border-border/50 focus:border-accent/50 focus:ring-accent/20 rounded-xl transition-all"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-ai-glow font-mono opacity-0 group-focus-within:opacity-100 transition-opacity">
              AI
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">Account</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/security')}>
                <Shield className="mr-2 h-4 w-4" />
                Security
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
