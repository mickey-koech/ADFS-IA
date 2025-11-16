import { FileText, Folder, Tag, Archive, Trash2, Users, Building2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardSidebarProps {
  selectedFolder: string | null;
  onFolderSelect: (folder: string | null) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function DashboardSidebar({
  selectedFolder,
  onFolderSelect,
  selectedTags,
  onTagsChange,
}: DashboardSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  
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
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <aside className="w-64 border-r bg-sidebar">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="h-6 w-6 text-sidebar-primary" />
          <h2 className="text-lg font-semibold text-sidebar-foreground">Filing System</h2>
        </div>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-sidebar-foreground mb-3 flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Folders
              </h3>
              <div className="space-y-1">
                <Button
                  variant={selectedFolder === null ? 'secondary' : 'ghost'}
                  className="w-full justify-start text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  onClick={() => onFolderSelect(null)}
                >
                  All Files
                </Button>
                {folders.map((folder) => (
                  <Button
                    key={folder}
                    variant={selectedFolder === folder ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    onClick={() => onFolderSelect(folder)}
                  >
                    {folder}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-sidebar-foreground mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </h3>
              <div className="space-y-2">
                {tags.map((tag) => (
                  <Button
                    key={tag}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    {selectedTags.includes(tag) && (
                      <Badge variant="secondary" className="ml-auto">✓</Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-sidebar-foreground mb-3">Quick Access</h3>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archived
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deleted
                </Button>
              </div>
            </div>

            {isAdmin && (
              <div>
                <h3 className="text-sm font-medium text-sidebar-foreground mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin
                </h3>
                <div className="space-y-1">
                  <Button
                    variant={location.pathname === '/admin' ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    onClick={() => navigate('/admin')}
                  >
                    Dashboard
                  </Button>
                  <Button
                    variant={location.pathname === '/admin/users' ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    onClick={() => navigate('/admin/users')}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Users
                  </Button>
                  <Button
                    variant={location.pathname === '/admin/departments' ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    onClick={() => navigate('/admin/departments')}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    Departments
                  </Button>
                  <Button
                    variant={location.pathname === '/admin/audit' ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    onClick={() => navigate('/admin/audit')}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Audit Logs
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
