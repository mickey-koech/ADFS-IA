import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Eye, Clock, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImpersonateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
}

export function ImpersonateDialog({ open, onOpenChange, targetUser }: ImpersonateDialogProps) {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleImpersonate = async () => {
    if (!targetUser || !user) return;

    setIsImpersonating(true);

    try {
      // Call the secure edge function to start impersonation with httpOnly cookies
      const { data, error } = await supabase.functions.invoke('impersonation-auth', {
        body: {
          action: 'start',
          targetUserId: targetUser.id,
        },
      });

      if (error) throw error;

      toast({
        title: 'Impersonation Started',
        description: `You are now viewing as ${targetUser.email}. Session expires in 30 minutes.`,
      });

      onOpenChange(false);
      
      // Navigate to user dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Impersonation error:', error);
      toast({
        title: 'Impersonation Failed',
        description: error.message || 'Failed to start impersonation session',
        variant: 'destructive',
      });
    } finally {
      setIsImpersonating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Impersonate User
          </DialogTitle>
          <DialogDescription>
            View the application as this user for troubleshooting purposes
          </DialogDescription>
        </DialogHeader>

        {targetUser && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">User</span>
                <span className="text-sm text-muted-foreground">{targetUser.full_name || 'No Name'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Email</span>
                <span className="text-sm text-muted-foreground">{targetUser.email}</span>
              </div>
            </div>

            <Alert className="border-warning/50 bg-warning/5">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-sm space-y-2">
                <p className="font-medium text-warning">Important Security Notes:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Session expires in 30 minutes
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3" />
                    All actions are logged and audited
                  </li>
                  <li>Only use for legitimate support purposes</li>
                  <li>Do not modify user data without permission</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isImpersonating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImpersonate}
            disabled={isImpersonating}
            className="bg-primary hover:bg-primary/90"
          >
            {isImpersonating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent mr-2" />
                Starting...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Start Impersonation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
