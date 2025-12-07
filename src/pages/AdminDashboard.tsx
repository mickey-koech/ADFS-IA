import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Building2, LogOut, UserCog, Shield, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DashboardWidgets } from '@/components/admin/DashboardWidgets';
import { formatDistanceToNow } from 'date-fns';
import { UploadFrequencyChart } from '@/components/admin/analytics/UploadFrequencyChart';
import { FileTypeDistribution } from '@/components/admin/analytics/FileTypeDistribution';
import { DepartmentActivityChart } from '@/components/admin/analytics/DepartmentActivityChart';
import { AIInsightsPanel } from '@/components/admin/analytics/AIInsightsPanel';
import { StatisticalSummary } from '@/components/admin/analytics/StatisticalSummary';
import { RecentUploadsTable } from '@/components/admin/analytics/RecentUploadsTable';
import { RealTimeNotifications } from '@/components/admin/RealTimeNotifications';
import { PDFExport } from '@/components/admin/PDFExport';
import { ChatAnalytics } from '@/components/admin/analytics/ChatAnalytics';
import { useRealTimeAnalytics } from '@/hooks/useRealTimeAnalytics';
import { Upload, Download, AlertCircle, Clock, TrendingUp, Users as UsersIcon, MessageCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  
  // Real-time analytics data
  const {
    uploadFrequency: realTimeUploadData,
    fileTypeDistribution: realTimeFileTypes,
    departmentActivity: realTimeDeptActivity,
    recentUploads: realTimeUploads,
    loading: analyticsLoading
  } = useRealTimeAnalytics();

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

  // Use real-time data with fallback to mock data
  const uploadFrequencyData = realTimeUploadData.length > 0 ? realTimeUploadData : [
    { date: '12/01', uploads: 45 },
    { date: '12/02', uploads: 52 },
    { date: '12/03', uploads: 38 },
    { date: '12/04', uploads: 65 },
    { date: '12/05', uploads: 58 },
    { date: '12/06', uploads: 72 },
    { date: '12/07', uploads: 68 },
  ];

  const fileTypeData = realTimeFileTypes.length > 0 ? realTimeFileTypes : [
    { name: 'PDF', value: 45, color: 'hsl(var(--primary))' },
    { name: 'DOCX', value: 30, color: 'hsl(var(--secondary))' },
    { name: 'XLSX', value: 15, color: 'hsl(var(--accent))' },
    { name: 'Images', value: 8, color: 'hsl(142, 76%, 36%)' },
    { name: 'Others', value: 2, color: 'hsl(38, 92%, 50%)' },
  ];

  const departmentActivityData = realTimeDeptActivity.length > 0 ? realTimeDeptActivity : [
    { department: 'Academic', uploads: 120, downloads: 95 },
    { department: 'Admin', uploads: 85, downloads: 70 },
    { department: 'Finance', uploads: 65, downloads: 80 },
    { department: 'HR', uploads: 45, downloads: 55 },
  ];

  const aiInsights = [
    {
      id: '1',
      type: 'anomaly' as const,
      title: 'Unusual Upload Spike Detected',
      description: 'Academic department showing 340% increase in uploads compared to last week. Possible exam period activity.',
      severity: 'medium' as const,
      confidence: 87,
    },
    {
      id: '2',
      type: 'prediction' as const,
      title: 'Storage Capacity Alert',
      description: 'Current trend suggests storage will reach 80% capacity within 2 weeks. Consider expansion.',
      severity: 'high' as const,
      confidence: 92,
    },
    {
      id: '3',
      type: 'recommendation' as const,
      title: 'Duplicate Files Found',
      description: '24 potential duplicate files detected across departments. Total recoverable space: 1.2GB.',
      severity: 'low' as const,
      confidence: 78,
    },
    {
      id: '4',
      type: 'warning' as const,
      title: 'Declining Activity Pattern',
      description: 'Finance department showing 45% decrease in file interactions over past month.',
      severity: 'medium' as const,
      confidence: 85,
    },
  ];

  const summaryStats = [
    { title: 'Uploads Today', value: '128', change: '+12%', trend: 'up' as const, icon: Upload, color: 'primary' },
    { title: 'Avg Upload Size', value: '2.4MB', change: '-5%', trend: 'down' as const, icon: TrendingUp, color: 'secondary' },
    { title: 'Flagged Files', value: '7', change: '+2', trend: 'up' as const, icon: AlertCircle, color: 'warning' },
    { title: 'Peak Activity', value: '2:30 PM', change: '', trend: 'neutral' as const, icon: Clock, color: 'success' },
    { title: 'Active Users', value: '89', change: '+15%', trend: 'up' as const, icon: UsersIcon, color: 'accent' },
    { title: 'Downloads', value: '342', change: '+8%', trend: 'up' as const, icon: Download, color: 'secondary' },
  ];

  const recentUploads = realTimeUploads.length > 0 ? realTimeUploads : [
    { id: '1', fileName: 'Q4_Financial_Report.pdf', user: 'John Doe', department: 'Finance', size: '2.4MB', status: 'reviewed' as const, timestamp: new Date().toISOString() },
    { id: '2', fileName: 'Student_Records_2024.xlsx', user: 'Jane Smith', department: 'Academic', size: '5.1MB', status: 'pending' as const, timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: '3', fileName: 'HR_Policy_Update.docx', user: 'Mike Wilson', department: 'HR', size: '892KB', status: 'reviewed' as const, timestamp: new Date(Date.now() - 7200000).toISOString() },
    { id: '4', fileName: 'Suspicious_File.zip', user: 'Unknown', department: 'IT', size: '15.2MB', status: 'flagged' as const, timestamp: new Date(Date.now() - 10800000).toISOString() },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      {/* Holographic Background Effect */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
      <div className="fixed inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
      
      {/* Header */}
      <header className="border-b border-primary/20 bg-card/40 backdrop-blur-xl sticky top-0 z-50 shadow-glass">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-glow animate-glow-pulse">
              <UserCog className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Command Center
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI-Digital Filing System • Advanced Analytics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PDFExport stats={stats} />
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 relative z-10">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="bg-card/50 border border-primary/20 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <TrendingUp className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Statistical Summary */}
            <div className="animate-fade-in">
              <h2 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                System Overview
              </h2>
              <StatisticalSummary stats={summaryStats} />
            </div>

          {/* Dashboard Widgets */}
          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <DashboardWidgets 
              stats={stats} 
              recentActivity={recentActivity}
              departmentStats={departmentStats}
            />
          </div>

          {/* Analytics Grid */}
          <div className="grid gap-6 lg:grid-cols-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <UploadFrequencyChart data={uploadFrequencyData} />
            <FileTypeDistribution data={fileTypeData} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="lg:col-span-2">
              <DepartmentActivityChart data={departmentActivityData} />
            </div>
            <div className="lg:col-span-1">
              <AIInsightsPanel insights={aiInsights} />
            </div>
          </div>

          {/* Real-Time Notifications */}
          <div className="animate-fade-in" style={{ animationDelay: '0.35s' }}>
            <RealTimeNotifications />
          </div>

          {/* Recent Uploads Table */}
          <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <RecentUploadsTable uploads={recentUploads} />
          </div>

          {/* Quick Actions */}
          <div className="grid gap-6 md:grid-cols-3 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <Card className="border-primary/20 hover:shadow-glow hover:border-primary/40 transition-all group bg-gradient-to-br from-card/80 to-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors">
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
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg"
                >
                  Manage Users
                </Button>
              </CardContent>
            </Card>

            <Card className="border-secondary/20 hover:shadow-glow hover:border-secondary/40 transition-all group bg-gradient-to-br from-card/80 to-secondary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 group-hover:text-secondary transition-colors">
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
                  className="w-full bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90 shadow-lg"
                >
                  Manage Departments
                </Button>
              </CardContent>
            </Card>

            <Card className="border-accent/20 hover:shadow-glow hover:border-accent/40 transition-all group bg-gradient-to-br from-card/80 to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 group-hover:text-accent transition-colors">
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
                  className="w-full bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 shadow-lg"
                >
                  View Audit Logs
                </Button>
              </CardContent>
            </Card>
          </div>
          </TabsContent>

          <TabsContent value="chat" className="space-y-8">
            <div className="animate-fade-in">
              <h2 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                Department Chat Analytics
              </h2>
              <ChatAnalytics />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
