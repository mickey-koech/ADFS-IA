import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, QrCode } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function TwoFactorAuth() {
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const { toast } = useToast();

  const enableTOTP = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Admin Account',
      });

      if (error) throw error;

      if (data) {
        setQrCode(data.totp.qr_code);
        setFactorId(data.id);
        toast({
          title: 'Scan QR Code',
          description: 'Use your authenticator app to scan the QR code',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyTOTP = async () => {
    if (!factorId || !verifyCode) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: verifyCode,
      });

      if (error) throw error;

      setIsEnabled(true);
      setQrCode(null);
      toast({
        title: 'Success',
        description: 'Two-factor authentication enabled successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const disableTOTP = async () => {
    if (!factorId) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      });

      if (error) throw error;

      setIsEnabled(false);
      setFactorId(null);
      toast({
        title: 'Success',
        description: 'Two-factor authentication disabled',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your admin account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isEnabled && !qrCode && (
          <Button onClick={enableTOTP} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Enable 2FA
          </Button>
        )}

        {qrCode && (
          <div className="space-y-4">
            <Alert>
              <QrCode className="h-4 w-4" />
              <AlertDescription>
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-center p-4 bg-background border border-border rounded-lg">
              <img src={qrCode} alt="QR Code" className="w-48 h-48" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="verify-code">Verification Code</Label>
              <Input
                id="verify-code"
                placeholder="Enter 6-digit code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                maxLength={6}
                disabled={loading}
              />
            </div>

            <Button onClick={verifyTOTP} disabled={loading || verifyCode.length !== 6} className="w-full">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Verify and Enable
            </Button>
          </div>
        )}

        {isEnabled && (
          <div className="space-y-4">
            <Alert className="border-success/50 bg-success/10">
              <Shield className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                Two-factor authentication is enabled
              </AlertDescription>
            </Alert>
            <Button variant="destructive" onClick={disableTOTP} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Disable 2FA
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}