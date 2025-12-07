import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Users, TrendingUp, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface DepartmentMessageCount {
  department: string;
  count: number;
  color: string;
}

interface ActiveUser {
  id: string;
  name: string;
  messageCount: number;
  department: string;
}

interface DailyActivity {
  date: string;
  messages: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)',
];

export function ChatAnalytics() {
  const [departmentStats, setDepartmentStats] = useState<DepartmentMessageCount[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChatAnalytics();
  }, []);

  const fetchChatAnalytics = async () => {
    try {
      // Fetch all messages with department info
      const { data: messages, count } = await supabase
        .from('department_messages')
        .select('id, sender_id, department_id, created_at, departments(name)', { count: 'exact' });

      setTotalMessages(count || 0);

      if (messages) {
        // Process department message counts
        const deptCounts = new Map<string, number>();
        messages.forEach((msg: any) => {
          const deptName = msg.departments?.name || 'Unknown';
          deptCounts.set(deptName, (deptCounts.get(deptName) || 0) + 1);
        });

        const deptStats: DepartmentMessageCount[] = Array.from(deptCounts.entries())
          .map(([department, count], index) => ({
            department,
            count,
            color: COLORS[index % COLORS.length],
          }))
          .sort((a, b) => b.count - a.count);

        setDepartmentStats(deptStats);

        // Process user message counts
        const userCounts = new Map<string, { count: number; departmentId: string }>();
        messages.forEach((msg: any) => {
          const existing = userCounts.get(msg.sender_id) || { count: 0, departmentId: msg.department_id };
          userCounts.set(msg.sender_id, { count: existing.count + 1, departmentId: msg.department_id });
        });

        // Fetch user profiles for top users
        const topUserIds = Array.from(userCounts.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 10)
          .map(([id]) => id);

        if (topUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, department_id, departments(name)')
            .in('id', topUserIds);

          const topUsers: ActiveUser[] = topUserIds.map(id => {
            const profile = profiles?.find((p: any) => p.id === id);
            const userData = userCounts.get(id)!;
            return {
              id,
              name: profile?.full_name || 'Unknown User',
              messageCount: userData.count,
              department: (profile as any)?.departments?.name || 'Unknown',
            };
          });

          setActiveUsers(topUsers);
        }

        // Process daily activity for last 7 days
        const last7Days = new Map<string, number>();
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          last7Days.set(dateStr, 0);
        }

        messages.forEach((msg: any) => {
          const msgDate = new Date(msg.created_at);
          const dateStr = msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (last7Days.has(dateStr)) {
            last7Days.set(dateStr, last7Days.get(dateStr)! + 1);
          }
        });

        const dailyData: DailyActivity[] = Array.from(last7Days.entries()).map(([date, messages]) => ({
          date,
          messages,
        }));

        setDailyActivity(dailyData);
      }
    } catch (error) {
      console.error('Error fetching chat analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-16 bg-muted/20" />
            <CardContent className="h-48 bg-muted/10" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Messages</p>
                <p className="text-2xl font-bold text-foreground">{totalMessages}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-secondary/20 bg-gradient-to-br from-card/80 to-secondary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-secondary/10">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Departments</p>
                <p className="text-2xl font-bold text-foreground">{departmentStats.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/20 bg-gradient-to-br from-card/80 to-accent/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold text-foreground">{activeUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Messages</p>
                <p className="text-2xl font-bold text-foreground">
                  {dailyActivity[dailyActivity.length - 1]?.messages || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Messages per Department Bar Chart */}
        <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <MessageCircle className="w-5 h-5 text-primary" />
              Messages per Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="department" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--primary) / 0.2)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Activity Line Chart */}
        <Card className="border-secondary/20 bg-gradient-to-br from-card/80 to-secondary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="w-5 h-5 text-secondary" />
              Chat Activity (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--secondary) / 0.2)',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="messages"
                  stroke="hsl(var(--secondary))"
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--secondary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: 'hsl(var(--accent))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Department Distribution Pie + Top Users */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie Chart */}
        <Card className="border-accent/20 bg-gradient-to-br from-card/80 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Users className="w-5 h-5 text-accent" />
              Department Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={departmentStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="department"
                  label={({ department, percent }) => `${department} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={true}
                >
                  {departmentStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--accent) / 0.2)',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Most Active Users */}
        <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="w-5 h-5 text-primary" />
              Most Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {activeUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No chat activity yet</p>
              ) : (
                activeUsers.map((user, index) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-primary">{user.messageCount}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
