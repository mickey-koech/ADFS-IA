import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Activity, FileUp, UserCheck, AlertTriangle, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLog {
  id: string;
  action: string;
  resource_type: string;
  created_at: string;
  metadata: any;
  user_id: string;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('activity-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
        },
        (payload) => {
          setActivities((prev) => [payload.new as ActivityLog, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'file_uploaded':
        return <FileUp className="h-4 w-4 text-primary" />;
      case 'user_approved':
      case 'user_rejected':
        return <UserCheck className="h-4 w-4 text-success" />;
      case 'file_deleted':
        return <Trash2 className="h-4 w-4 text-destructive" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionBadge = (action: string) => {
    const variant = action.includes('delete') || action.includes('reject') ? 'destructive' : 'default';
    return <Badge variant={variant}>{action.replace(/_/g, ' ')}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>Real-time feed of system events</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p>No activity yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-1">{getActivityIcon(activity.action)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {getActionBadge(activity.action)}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">
                      {activity.resource_type}
                    </p>
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {JSON.stringify(activity.metadata, null, 2).substring(0, 100)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
