import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Download, Search, Filter, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: any;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
}

export default function AdminAudit() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as ActivityLog[];
    },
  });

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === '' ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.metadata).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesResource = resourceFilter === 'all' || log.resource_type === resourceFilter;

    return matchesSearch && matchesAction && matchesResource;
  });

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action)));
  const uniqueResources = Array.from(new Set(logs.map((log) => log.resource_type)));

  const exportToCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Timestamp', 'Action', 'Resource Type', 'User ID', 'IP Address', 'Details'];
    const rows = filteredLogs.map((log) => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.action,
      log.resource_type,
      log.user_id || 'N/A',
      log.ip_address || 'N/A',
      JSON.stringify(log.metadata),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Audit logs exported successfully');
  };

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
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <FileText className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-display text-primary">Audit Logs</h1>
                <p className="text-sm text-muted-foreground">System activity and security events</p>
              </div>
            </div>
          </div>
          <Button onClick={exportToCSV} variant="outline" className="border-primary/20">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-6">
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {uniqueResources.map((resource) => (
                  <SelectItem key={resource} value={resource}>
                    {resource}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border border-border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource Type</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{log.action}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.resource_type}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.user_id ? log.user_id.substring(0, 8) + '...' : 'System'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ip_address || 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {log.metadata ? JSON.stringify(log.metadata) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {filteredLogs.length} of {logs.length} logs
            </span>
            <span>Last 500 events loaded</span>
          </div>
        </div>
      </main>
    </div>
  );
}
