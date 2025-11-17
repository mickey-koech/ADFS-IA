import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Check, X, UserCog } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  is_approved: boolean;
  department_id: string | null;
  approved_at: string | null;
  departments: { name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

export default function AdminUsers() {
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<Record<string, string>>({});
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkDepartment, setBulkDepartment] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
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

  const fetchData = async () => {
    try {
      const [profilesRes, deptsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*, departments(name)')
          .order('created_at', { ascending: false }),
        supabase.from('departments').select('id, name').eq('is_active', true),
      ]);

      if (profilesRes.data) {
        setPendingUsers(profilesRes.data.filter(p => !p.is_approved));
        setApprovedUsers(profilesRes.data.filter(p => p.is_approved));
      }

      if (deptsRes.data) {
        setDepartments(deptsRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleApprove = async (userId: string) => {
    const deptId = selectedDepts[userId] || null;

    try {
      const { error } = await supabase.rpc('approve_user', {
        user_id_to_approve: userId,
        dept_id: deptId,
      });

      if (error) throw error;

      toast({
        title: 'User Approved',
        description: 'User has been successfully approved.',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Approval Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      toast({
        title: 'User Rejected',
        description: 'User registration has been rejected.',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Rejection Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === pendingUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(pendingUsers.map(u => u.id)));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedUsers.size === 0) {
      toast({
        title: 'No Users Selected',
        description: 'Please select users to approve.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const promises = Array.from(selectedUsers).map(userId =>
        supabase.rpc('approve_user', {
          user_id_to_approve: userId,
          dept_id: bulkDepartment || null,
        })
      );

      await Promise.all(promises);

      toast({
        title: 'Bulk Approval Complete',
        description: `${selectedUsers.size} user(s) approved successfully.`,
      });

      setSelectedUsers(new Set());
      setBulkDepartment('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Bulk Approval Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleBulkReject = async () => {
    if (selectedUsers.size === 0) {
      toast({
        title: 'No Users Selected',
        description: 'Please select users to reject.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const promises = Array.from(selectedUsers).map(userId =>
        supabase.auth.admin.deleteUser(userId)
      );

      await Promise.all(promises);

      toast({
        title: 'Bulk Rejection Complete',
        description: `${selectedUsers.size} user(s) rejected successfully.`,
      });

      setSelectedUsers(new Set());
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Bulk Rejection Failed',
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background">
      {/* Header */}
      <header className="border-b border-primary/10 bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin')}
            className="hover:bg-primary/5"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-display text-primary">User Management</h1>
              <p className="text-sm text-muted-foreground">Review and approve user registrations</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-secondary/50 border border-primary/10">
            <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-accent">
              Pending ({pendingUsers.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="data-[state=active]:bg-primary data-[state=active]:text-accent">
              Approved ({approvedUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingUsers.length === 0 ? (
              <Card className="border-primary/10">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No pending user approvals</p>
                </CardContent>
              </Card>
            ) : (
              pendingUsers.map((user) => (
                <Card key={user.id} className="border-warning/20 hover:shadow-elegant transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="font-display">{user.full_name || 'No Name'}</CardTitle>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Registered {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-warning text-warning">Pending</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center gap-4">
                    <Select
                      value={selectedDepts[user.id] || ''}
                      onValueChange={(value) => setSelectedDepts({ ...selectedDepts, [user.id]: value })}
                    >
                      <SelectTrigger className="flex-1 border-primary/20">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => handleApprove(user.id)}
                      className="bg-success hover:bg-success/90"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(user.id)}
                      variant="destructive"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedUsers.length === 0 ? (
              <Card className="border-primary/10">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No approved users yet</p>
                </CardContent>
              </Card>
            ) : (
              approvedUsers.map((user) => (
                <Card key={user.id} className="border-primary/10 hover:shadow-elegant transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="font-display">{user.full_name || 'No Name'}</CardTitle>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Registered {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</span>
                          {user.approved_at && (
                            <span>Approved {formatDistanceToNow(new Date(user.approved_at), { addSuffix: true })}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline" className="border-success text-success">Approved</Badge>
                        {user.departments && (
                          <Badge variant="secondary">{user.departments.name}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
