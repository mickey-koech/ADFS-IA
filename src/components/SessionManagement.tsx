import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Monitor, Smartphone, Tablet, Loader2, LogOut } from 'lucide-react';
import { format } from 'date-fns';

interface Session {
  id: string;
  created_at: string;
  updated_at: string;
  factor_id: string;
  aal: string;
  user_agent?: string;
}

export function SessionManagement() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Supabase doesn't expose all sessions via client API
        // Store current session info
        setSessions([{
          id: session.access_token,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          factor_id: '',
          aal: 'aal1',
          user_agent: navigator.userAgent,
        }]);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Session revoked',
        description: 'You have been signed out',
      });
    } catch (error) {
      console.error('Error revoking session:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke session',
        variant: 'destructive',
      });
    } finally {
      setRevokingId(null);
    }
  };

  const getDeviceIcon = (userAgent?: string) => {
    if (!userAgent) return <Monitor className="h-5 w-5" />;
    if (/mobile/i.test(userAgent)) return <Smartphone className="h-5 w-5" />;
    if (/tablet/i.test(userAgent)) return <Tablet className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  const getDeviceInfo = (userAgent?: string) => {
    if (!userAgent) return 'Unknown Device';
    if (/mobile/i.test(userAgent)) return 'Mobile Device';
    if (/tablet/i.test(userAgent)) return 'Tablet';
    return 'Desktop';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Sessions</CardTitle>
        <CardDescription>
          Manage your active sessions across different devices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active sessions</p>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-4 border border-border rounded-lg bg-card"
            >
              <div className="flex items-center gap-3">
                <div className="text-primary">
                  {getDeviceIcon(session.user_agent)}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {getDeviceInfo(session.user_agent)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Current session • Active now
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => revokeSession(session.id)}
                disabled={revokingId === session.id}
              >
                {revokingId === session.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </>
                )}
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}