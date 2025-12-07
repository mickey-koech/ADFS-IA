import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  Search, 
  Upload, 
  MessageCircle, 
  Settings, 
  Shield, 
  User,
  LogOut,
  Moon,
  Sun,
  Folder,
  Tag,
  Bell,
  X,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

interface FloatingDockProps {
  onFolderSelect?: (folder: string | null) => void;
  onTagsChange?: (tags: string[]) => void;
  selectedFolder?: string | null;
  selectedTags?: string[];
  onChatOpen?: () => void;
  chatOpen?: boolean;
}

interface DockItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action?: () => void;
  route?: string;
  badge?: number;
  adminOnly?: boolean;
}

export function FloatingDock({
  onFolderSelect,
  onTagsChange,
  selectedFolder,
  selectedTags = [],
  onChatOpen,
  chatOpen,
}: FloatingDockProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isAdmin, setIsAdmin] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [foldersOpen, setFoldersOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const folders = ['Documents', 'Images', 'Reports', 'Archives'];
  const tags = ['Important', 'Urgent', 'Student Records', 'Administrative'];

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) return;
    const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    setIsAdmin(data === true);
  };

  const toggleTag = (tag: string) => {
    if (!onTagsChange) return;
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const dockItems: DockItem[] = [
    {
      id: 'home',
      icon: Home,
      label: 'Dashboard',
      route: '/dashboard',
    },
    {
      id: 'files',
      icon: FileText,
      label: 'All Files',
      action: () => onFolderSelect?.(null),
    },
    {
      id: 'chat',
      icon: MessageCircle,
      label: 'Department Chat',
      action: onChatOpen,
    },
    {
      id: 'profile',
      icon: User,
      label: 'Profile',
      route: '/profile',
    },
    {
      id: 'security',
      icon: Settings,
      label: 'Security',
      route: '/security',
    },
    {
      id: 'admin',
      icon: Shield,
      label: 'Admin Portal',
      route: '/admin',
      adminOnly: true,
    },
  ];

  const filteredItems = dockItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 px-4 py-3 bg-surface/80 backdrop-blur-xl border border-primary/20 rounded-2xl shadow-elegant">
        {/* Folders Popover */}
        <Popover open={foldersOpen} onOpenChange={setFoldersOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "relative p-3 rounded-xl transition-all duration-300 group",
                foldersOpen 
                  ? "bg-primary text-accent scale-110" 
                  : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
              )}
              onMouseEnter={() => setHoveredItem('folders')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Folder className={cn(
                "w-6 h-6 transition-transform duration-300",
                hoveredItem === 'folders' && "scale-110 -translate-y-1"
              )} />
              {selectedFolder && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full" />
              )}
              {hoveredItem === 'folders' && !foldersOpen && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-primary text-accent text-xs rounded-md whitespace-nowrap">
                  Folders
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" side="top" sideOffset={12}>
            <div className="space-y-1">
              <Button
                variant={selectedFolder === null ? 'secondary' : 'ghost'}
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  onFolderSelect?.(null);
                  setFoldersOpen(false);
                }}
              >
                All Files
              </Button>
              {folders.map((folder) => (
                <Button
                  key={folder}
                  variant={selectedFolder === folder ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    onFolderSelect?.(folder);
                    setFoldersOpen(false);
                  }}
                >
                  {folder}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Tags Popover */}
        <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "relative p-3 rounded-xl transition-all duration-300 group",
                tagsOpen 
                  ? "bg-primary text-accent scale-110" 
                  : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
              )}
              onMouseEnter={() => setHoveredItem('tags')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Tag className={cn(
                "w-6 h-6 transition-transform duration-300",
                hoveredItem === 'tags' && "scale-110 -translate-y-1"
              )} />
              {selectedTags.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-primary text-xs rounded-full flex items-center justify-center font-bold">
                  {selectedTags.length}
                </span>
              )}
              {hoveredItem === 'tags' && !tagsOpen && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-primary text-accent text-xs rounded-md whitespace-nowrap">
                  Tags
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" side="top" sideOffset={12}>
            <div className="space-y-1">
              {tags.map((tag) => (
                <Button
                  key={tag}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                  {selectedTags.includes(tag) && (
                    <Badge variant="secondary" className="ml-2">✓</Badge>
                  )}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-8 bg-primary/20 mx-2" />

        {/* Main Dock Items */}
        {filteredItems.map((item) => {
          const isActive = item.route === location.pathname || (item.id === 'chat' && chatOpen);
          const Icon = item.icon;

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "relative p-3 rounded-xl transition-all duration-300 group",
                    isActive 
                      ? "bg-primary text-accent scale-110" 
                      : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                  )}
                  onClick={() => {
                    if (item.route) navigate(item.route);
                    else if (item.action) item.action();
                  }}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Icon className={cn(
                    "w-6 h-6 transition-transform duration-300",
                    hoveredItem === item.id && "scale-110 -translate-y-1"
                  )} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                  {hoveredItem === item.id && (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-primary text-accent text-xs rounded-md whitespace-nowrap animate-fade-in">
                      {item.label}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="hidden">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        <div className="w-px h-8 bg-primary/20 mx-2" />

        {/* Notifications Bell */}
        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "relative p-3 rounded-xl transition-all duration-300 group",
                notificationsOpen 
                  ? "bg-primary text-accent scale-110" 
                  : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
              )}
              onMouseEnter={() => setHoveredItem('notifications')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Bell className={cn(
                "w-6 h-6 transition-transform duration-300",
                hoveredItem === 'notifications' && "scale-110 -translate-y-1"
              )} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              {hoveredItem === 'notifications' && !notificationsOpen && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-primary text-accent text-xs rounded-md whitespace-nowrap">
                  Notifications
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" side="top" sideOffset={12}>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h4 className="font-semibold text-foreground">Notifications</h4>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
                  <Check className="w-3 h-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.slice(0, 20).map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                        !notification.read && "bg-primary/5"
                      )}
                      onClick={() => {
                        markAsRead(notification.id);
                        if (notification.type === 'message') {
                          onChatOpen?.();
                          setNotificationsOpen(false);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          notification.type === 'message' && "bg-primary/10 text-primary",
                          notification.type === 'alert' && "bg-destructive/10 text-destructive",
                          notification.type === 'system' && "bg-secondary/10 text-secondary"
                        )}>
                          {notification.type === 'message' && <MessageCircle className="w-4 h-4" />}
                          {notification.type === 'alert' && <Shield className="w-4 h-4" />}
                          {notification.type === 'system' && <Bell className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Theme Toggle */}
        <button
          className={cn(
            "p-3 rounded-xl transition-all duration-300",
            "hover:bg-primary/10 text-muted-foreground hover:text-primary"
          )}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          onMouseEnter={() => setHoveredItem('theme')}
          onMouseLeave={() => setHoveredItem(null)}
        >
          {theme === 'dark' ? (
            <Sun className={cn(
              "w-6 h-6 transition-transform duration-300",
              hoveredItem === 'theme' && "scale-110 -translate-y-1"
            )} />
          ) : (
            <Moon className={cn(
              "w-6 h-6 transition-transform duration-300",
              hoveredItem === 'theme' && "scale-110 -translate-y-1"
            )} />
          )}
          {hoveredItem === 'theme' && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-primary text-accent text-xs rounded-md whitespace-nowrap">
              Toggle Theme
            </span>
          )}
        </button>

        {/* Logout */}
        <button
          className={cn(
            "p-3 rounded-xl transition-all duration-300",
            "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          )}
          onClick={signOut}
          onMouseEnter={() => setHoveredItem('logout')}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <LogOut className={cn(
            "w-6 h-6 transition-transform duration-300",
            hoveredItem === 'logout' && "scale-110 -translate-y-1"
          )} />
          {hoveredItem === 'logout' && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded-md whitespace-nowrap">
              Sign Out
            </span>
          )}
        </button>
      </div>
    </div>
  );
}