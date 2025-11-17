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
    const interval = setInterval(checkImpersonation, 1000);
    return () => clearInterval(interval);
  }, []);

  const checkImpersonation = () => {
    const data = sessionStorage.getItem('impersonation');
    if (!data) {
      setImpersonationData(null);
      return;
    }

    const impersonation = JSON.parse(data);
    const expiresAt = new Date(impersonation.expiresAt);
    const now = new Date();

    if (now >= expiresAt) {
      endImpersonation();
      return;
    }

    setImpersonationData(impersonation);

    const diff = expiresAt.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
  };

  const endImpersonation = async () => {
    if (!impersonationData) return;

    try {
      await supabase.rpc('log_impersonation', {
        _admin_id: impersonationData.adminId,
        _target_user_id: impersonationData.targetUserId,
        _action: 'impersonate_end',
        _session_token: impersonationData.sessionToken,
      });

      sessionStorage.removeItem('impersonation');
      setImpersonationData(null);

      toast({
        title: 'Impersonation Ended',
        description: 'You have returned to your admin account',
      });

      navigate('/admin');
    } catch (error) {
      console.error('Error ending impersonation:', error);
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
