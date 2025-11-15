import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, AlertCircle, Building2, LogOut, UserCog } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalUsers: number;
  pendingUsers: number;
  approvedUsers: number;
  totalFiles: number;
  departments: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    pendingUsers: 0,
    approvedUsers: 0,
    totalFiles: 0,
    departments: 0,
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
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

  const fetchStats = async () => {
    try {
      const [profilesRes, filesRes, deptsRes] = await Promise.all([
        supabase.from('profiles').select('is_approved', { count: 'exact' }),
        supabase.from('files').select('id', { count: 'exact' }),
        supabase.from('departments').select('id', { count: 'exact' }),
      ]);

      const pendingCount = profilesRes.data?.filter(p => !p.is_approved).length || 0;
      const approvedCount = profilesRes.data?.filter(p => p.is_approved).length || 0;

      setStats({
        totalUsers: profilesRes.count || 0,
        pendingUsers: pendingCount,
        approvedUsers: approvedCount,
        totalFiles: filesRes.count || 0,
        departments: deptsRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background">
      {/* Header */}
      <header className="border-b border-primary/10 bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-display text-primary">Admin Portal</h1>
              <p className="text-sm text-muted-foreground">AI-Powered Digital Filing System</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="border-primary/20 hover:bg-primary/5"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-primary/10 hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display text-primary animate-fade-in">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="border-warning/20 hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
              <AlertCircle className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display text-warning animate-fade-in">{stats.pendingUsers}</div>
            </CardContent>
          </Card>

          <Card className="border-success/20 hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved Users</CardTitle>
              <Users className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display text-success animate-fade-in">{stats.approvedUsers}</div>
            </CardContent>
          </Card>

          <Card className="border-primary/10 hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Departments</CardTitle>
              <Building2 className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display text-primary animate-fade-in">{stats.departments}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-primary/10 hover:shadow-glow transition-all duration-300">
            <CardHeader>
              <CardTitle className="font-display text-primary">User Management</CardTitle>
              <CardDescription>Review and approve pending user registrations</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/admin/users')}
                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:shadow-glow"
              >
                Manage Users
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/10 hover:shadow-glow transition-all duration-300">
            <CardHeader>
              <CardTitle className="font-display text-primary">Department Management</CardTitle>
              <CardDescription>Organize and manage department structure</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/admin/departments')}
                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:shadow-glow"
              >
                Manage Departments
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
