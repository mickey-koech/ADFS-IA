import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogOut, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ImpersonationBanner() {
  const [impersonationData, setImpersonationData] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkImpersonation();
    const interval = setInterval(checkImpersonation, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkImpersonation = async () => {
    try {
      // Check if we have valid impersonation cookies by making a test query
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email')
        .single();
      
      // If we can fetch profile data, we're either logged in normally or impersonating
      // We can detect impersonation by checking if there's a special header or cookie
      // For now, we'll rely on the backend to manage the cookie state
      
      // Since we can't read httpOnly cookies from JavaScript, we'll check activity logs
      const { data: recentImpersonation } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('action', 'impersonate_start')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentImpersonation) {
        const startTime = new Date(recentImpersonation.created_at);
        const expiresAt = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 minutes
        const now = new Date();

        if (now < expiresAt && recentImpersonation.impersonated_user_id) {
          // Get target user info
          const { data: targetUser } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', recentImpersonation.impersonated_user_id)
            .single();

          setImpersonationData({
            adminId: recentImpersonation.user_id,
            targetUserId: recentImpersonation.impersonated_user_id,
            targetUserEmail: targetUser?.email || 'Unknown',
            expiresAt: expiresAt.toISOString(),
          });

          const diff = expiresAt.getTime() - now.getTime();
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setImpersonationData(null);
        }
      } else {
        setImpersonationData(null);
      }
    } catch (error) {
      console.error('Error checking impersonation:', error);
      setImpersonationData(null);
    }
  };

  const endImpersonation = async () => {
    if (!impersonationData) return;

    try {
      // Call the secure edge function to end impersonation and clear httpOnly cookies
      const { error } = await supabase.functions.invoke('impersonation-auth', {
        body: {
          action: 'end',
          targetUserId: impersonationData.targetUserId,
        },
      });

      if (error) throw error;

      setImpersonationData(null);

      toast({
        title: 'Impersonation Ended',
        description: 'You have returned to your admin account',
      });

      navigate('/admin');
    } catch (error) {
      console.error('Error ending impersonation:', error);
      toast({
        title: 'Error',
        description: 'Failed to end impersonation session',
        variant: 'destructive',
      });
    }
  };

  if (!impersonationData) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-warning text-warning-foreground px-4 py-2 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <div className="text-sm">
            <span className="font-semibold">Admin Impersonation Mode</span>
            <span className="ml-2">Viewing as: {impersonationData.targetUserEmail}</span>
          </div>
          <div className="flex items-center gap-1 text-xs bg-warning-foreground/10 px-2 py-1 rounded">
            <Clock className="h-3 w-3" />
            <span>{timeRemaining}</span>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={endImpersonation}
          className="bg-warning-foreground/20 hover:bg-warning-foreground/30"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Exit Impersonation
        </Button>
      </div>
    </div>
  );
}
