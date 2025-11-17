import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Building2, LogOut, UserCog, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DashboardWidgets } from '@/components/admin/DashboardWidgets';
import { formatDistanceToNow } from 'date-fns';

interface DashboardStats {
  totalUsers: number;
  pendingUsers: number;
  approvedUsers: number;
  totalFiles: number;
  departments: number;
}

interface RecentActivity {
  id: string;
  action: string;
  user_email: string;
  timestamp: string;
}

interface DepartmentStats {
  name: string;
  userCount: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    pendingUsers: 0,
    approvedUsers: 0,
    totalFiles: 0,
    departments: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
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
      const [profilesRes, filesRes, deptsRes, activityRes, deptStatsRes] = await Promise.all([
        supabase.from('profiles').select('is_approved', { count: 'exact' }),
        supabase.from('files').select('id', { count: 'exact' }),
        supabase.from('departments').select('id', { count: 'exact' }),
        supabase
          .from('activity_logs')
          .select('id, action, user_id, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('profiles')
          .select('department_id, departments(name)')
          .eq('is_approved', true)
          .not('department_id', 'is', null)
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

      // Process recent activity
      if (activityRes.data) {
        const activities: RecentActivity[] = await Promise.all(
          activityRes.data.map(async (log) => {
            let userEmail = 'System';
            if (log.user_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', log.user_id)
                .single();
              userEmail = profile?.email || 'Unknown';
            }
            return {
              id: log.id,
              action: log.action,
              user_email: userEmail,
              timestamp: log.created_at,
            };
          })
        );
        setRecentActivity(activities);
      }

      // Process department stats
      if (deptStatsRes.data) {
        const deptMap = new Map<string, number>();
        deptStatsRes.data.forEach((profile: any) => {
          if (profile.departments?.name) {
            const count = deptMap.get(profile.departments.name) || 0;
            deptMap.set(profile.departments.name, count + 1);
          }
        });

        const deptStatsArray = Array.from(deptMap.entries())
          .map(([name, userCount]) => ({ name, userCount }))
          .sort((a, b) => b.userCount - a.userCount);
        
        setDepartmentStats(deptStatsArray);
      }
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
        <div className="space-y-6">
          {/* Dashboard Widgets */}
          <DashboardWidgets 
            stats={stats} 
            recentActivity={recentActivity}
            departmentStats={departmentStats}
          />

          {/* Quick Actions */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-primary/10 hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Review and approve user registrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate('/admin/users')}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  Manage Users
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary/10 hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Departments
                </CardTitle>
                <CardDescription>
                  Create and manage departments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate('/admin/departments')}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  Manage Departments
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary/10 hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Audit Logs
                </CardTitle>
                <CardDescription>
                  View system activity and logs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate('/admin/audit')}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  View Audit Logs
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
