import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import PendingApproval from '@/components/PendingApproval';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkApprovalStatus();
  }, [user]);

  const checkApprovalStatus = async () => {
    if (!user) {
      setChecking(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking approval status:', error);
        setIsApproved(false);
      } else {
        setIsApproved(data?.is_approved ?? false);
      }
    } catch (error) {
      console.error('Error checking approval status:', error);
      setIsApproved(false);
    } finally {
      setChecking(false);
    }
  };

  if (authLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show pending approval screen if user is not approved
  if (isApproved === false) {
    return <PendingApproval />;
  }

  return <>{children}</>;
}
