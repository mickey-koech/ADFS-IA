import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeft, Building2, Plus, MoreVertical, Edit, Archive, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  created_by: string | null;
}

export default function AdminDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchDepartments();
    }
  }, [isAdmin]);

  const checkAdminRole = async () => {
    if (!user) {
      navigate('/admin/login');
      return;
    }

    const { data, error } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (error || !data) {
      toast({
        title: 'Access Denied',
        description: 'You do not have admin privileges.',
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }

    setIsAdmin(true);
    setLoading(false);
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch departments',
        variant: 'destructive',
      });
    }
  };

  const handleOpenDialog = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({ name: dept.name, description: dept.description || '' });
    } else {
      setEditingDept(null);
      setFormData({ name: '', description: '' });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDept(null);
    setFormData({ name: '', description: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingDept) {
        // Update existing department
        const { error } = await supabase
          .from('departments')
          .update({
            name: formData.name,
            description: formData.description || null,
          })
          .eq('id', editingDept.id);

        if (error) throw error;

        toast({
          title: 'Department Updated',
          description: 'Department has been successfully updated.',
        });
      } else {
        // Create new department
        const { error } = await supabase
          .from('departments')
          .insert({
            name: formData.name,
            description: formData.description || null,
            created_by: user?.id,
          });

        if (error) throw error;

        toast({
          title: 'Department Created',
          description: 'New department has been successfully created.',
        });
      }

      handleCloseDialog();
      fetchDepartments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (dept: Department) => {
    try {
      const { error } = await supabase
        .from('departments')
        .update({ is_active: !dept.is_active })
        .eq('id', dept.id);

      if (error) throw error;

      toast({
        title: dept.is_active ? 'Department Deactivated' : 'Department Activated',
        description: `${dept.name} has been ${dept.is_active ? 'deactivated' : 'activated'}.`,
      });

      fetchDepartments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const activeDepartments = departments.filter(d => d.is_active);
  const inactiveDepartments = departments.filter(d => !d.is_active);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background">
      {/* Header */}
      <header className="border-b border-primary/10 bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/admin')}
              className="hover:bg-primary/5"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-display text-primary">Department Management</h1>
                <p className="text-sm text-muted-foreground">Organize and manage departments</p>
              </div>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => handleOpenDialog()}
                className="bg-gradient-to-r from-primary to-primary/90 hover:shadow-glow"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-surface border-primary/10">
              <DialogHeader>
                <DialogTitle className="font-display text-primary">
                  {editingDept ? 'Edit Department' : 'Create New Department'}
                </DialogTitle>
                <DialogDescription>
                  {editingDept
                    ? 'Update department information below.'
                    : 'Add a new department to organize your users.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Department Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Human Resources"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="border-primary/20 focus:border-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of this department..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="border-primary/20 focus:border-accent resize-none"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                    disabled={submitting}
                    className="border-primary/20"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-primary to-primary/90 hover:shadow-glow"
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent" />
                        {editingDept ? 'Updating...' : 'Creating...'}
                      </div>
                    ) : (
                      <>{editingDept ? 'Update Department' : 'Create Department'}</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-primary/10 hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Departments</CardTitle>
              <Building2 className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display text-primary animate-fade-in">{departments.length}</div>
            </CardContent>
          </Card>

          <Card className="border-success/20 hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
              <CheckCircle className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display text-success animate-fade-in">{activeDepartments.length}</div>
            </CardContent>
          </Card>

          <Card className="border-muted/20 hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
              <Archive className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display text-muted-foreground animate-fade-in">{inactiveDepartments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Active Departments */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-display text-primary mb-4">Active Departments</h2>
            {activeDepartments.length === 0 ? (
              <Card className="border-primary/10">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No active departments</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeDepartments.map((dept) => (
                  <Card key={dept.id} className="border-primary/10 hover:shadow-elegant transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="font-display text-lg">{dept.name}</CardTitle>
                            <Badge variant="outline" className="border-success text-success">Active</Badge>
                          </div>
                          <CardDescription className="line-clamp-2">
                            {dept.description || 'No description provided'}
                          </CardDescription>
                          <p className="text-xs text-muted-foreground mt-2">
                            Updated {formatDistanceToNow(new Date(dept.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-primary/5">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-surface border-primary/10 z-50">
                            <DropdownMenuItem
                              onClick={() => handleOpenDialog(dept)}
                              className="cursor-pointer hover:bg-primary/5"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Department
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(dept)}
                              className="cursor-pointer hover:bg-warning/5 text-warning"
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Inactive Departments */}
          {inactiveDepartments.length > 0 && (
            <div>
              <h2 className="text-xl font-display text-primary mb-4">Inactive Departments</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inactiveDepartments.map((dept) => (
                  <Card key={dept.id} className="border-muted/20 hover:shadow-elegant transition-all duration-300 opacity-60">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="font-display text-lg text-muted-foreground">{dept.name}</CardTitle>
                            <Badge variant="outline" className="border-muted text-muted-foreground">Inactive</Badge>
                          </div>
                          <CardDescription className="line-clamp-2">
                            {dept.description || 'No description provided'}
                          </CardDescription>
                          <p className="text-xs text-muted-foreground mt-2">
                            Deactivated {formatDistanceToNow(new Date(dept.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-primary/5">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-surface border-primary/10 z-50">
                            <DropdownMenuItem
                              onClick={() => handleOpenDialog(dept)}
                              className="cursor-pointer hover:bg-primary/5"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Department
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(dept)}
                              className="cursor-pointer hover:bg-success/5 text-success"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
