import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { FileDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface PDFExportProps {
  stats?: {
    totalUsers: number;
    pendingUsers: number;
    approvedUsers: number;
    totalFiles: number;
    departments: number;
  };
}

export function PDFExport({ stats }: PDFExportProps) {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const generateSystemReport = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF();
      const currentDate = format(new Date(), 'PPpp');

      // Header
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 0, 210, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text('ADFS Analytics Report', 14, 20);
      pdf.setFontSize(10);
      pdf.text(`Generated: ${currentDate}`, 14, 30);

      // Reset text color
      pdf.setTextColor(0, 0, 0);

      // System Overview
      pdf.setFontSize(16);
      pdf.text('System Overview', 14, 55);
      
      if (stats) {
        autoTable(pdf, {
          startY: 60,
          head: [['Metric', 'Value']],
          body: [
            ['Total Users', String(stats.totalUsers)],
            ['Approved Users', String(stats.approvedUsers)],
            ['Pending Users', String(stats.pendingUsers)],
            ['Total Files', String(stats.totalFiles)],
            ['Departments', String(stats.departments)],
          ],
          theme: 'striped',
          headStyles: { fillColor: [37, 99, 235] },
        });
      }

      // Fetch recent activity
      const { data: activityData } = await supabase
        .from('activity_logs')
        .select('action, created_at, resource_type')
        .order('created_at', { ascending: false })
        .limit(20);

      if (activityData && activityData.length > 0) {
        const finalY = (pdf as any).lastAutoTable.finalY || 100;
        pdf.setFontSize(16);
        pdf.text('Recent Activity', 14, finalY + 15);

        autoTable(pdf, {
          startY: finalY + 20,
          head: [['Action', 'Resource', 'Time']],
          body: activityData.map(a => [
            a.action,
            a.resource_type,
            format(new Date(a.created_at), 'PPp')
          ]),
          theme: 'striped',
          headStyles: { fillColor: [37, 99, 235] },
        });
      }

      // Fetch file statistics
      const { data: fileData } = await supabase
        .from('files')
        .select('mime_type')
        .eq('is_deleted', false);

      if (fileData && fileData.length > 0) {
        const finalY = (pdf as any).lastAutoTable.finalY || 150;
        
        // Calculate file type distribution
        const typeCount: Record<string, number> = {};
        fileData.forEach(f => {
          const type = f.mime_type?.split('/')[1]?.toUpperCase() || 'Unknown';
          typeCount[type] = (typeCount[type] || 0) + 1;
        });

        pdf.setFontSize(16);
        pdf.text('File Distribution', 14, finalY + 15);

        autoTable(pdf, {
          startY: finalY + 20,
          head: [['File Type', 'Count', 'Percentage']],
          body: Object.entries(typeCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([type, count]) => [
              type,
              String(count),
              `${((count / fileData.length) * 100).toFixed(1)}%`
            ]),
          theme: 'striped',
          headStyles: { fillColor: [37, 99, 235] },
        });
      }

      // Footer
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          `AI-Digital Filing System - Page ${i} of ${pageCount}`,
          pdf.internal.pageSize.getWidth() / 2,
          pdf.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      pdf.save(`ADFS_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: 'Report Generated',
        description: 'Your PDF report has been downloaded.',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF report',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const generateUserReport = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF();
      const currentDate = format(new Date(), 'PPpp');

      // Header
      pdf.setFillColor(16, 185, 129);
      pdf.rect(0, 0, 210, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text('User Management Report', 14, 20);
      pdf.setFontSize(10);
      pdf.text(`Generated: ${currentDate}`, 14, 30);

      pdf.setTextColor(0, 0, 0);

      // Fetch all users
      const { data: users } = await supabase
        .from('profiles')
        .select('full_name, email, is_approved, created_at, departments(name)')
        .order('created_at', { ascending: false });

      if (users && users.length > 0) {
        pdf.setFontSize(16);
        pdf.text('All Users', 14, 55);

        autoTable(pdf, {
          startY: 60,
          head: [['Name', 'Email', 'Department', 'Status', 'Joined']],
          body: users.map((u: any) => [
            u.full_name || 'N/A',
            u.email,
            u.departments?.name || 'Unassigned',
            u.is_approved ? 'Approved' : 'Pending',
            format(new Date(u.created_at), 'PP')
          ]),
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129] },
          styles: { fontSize: 8 },
        });
      }

      pdf.save(`ADFS_Users_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: 'Report Generated',
        description: 'User report has been downloaded.',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate user report',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const generateSecurityReport = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF();
      const currentDate = format(new Date(), 'PPpp');

      // Header
      pdf.setFillColor(239, 68, 68);
      pdf.rect(0, 0, 210, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text('Security Audit Report', 14, 20);
      pdf.setFontSize(10);
      pdf.text(`Generated: ${currentDate}`, 14, 30);

      pdf.setTextColor(0, 0, 0);

      // Fetch alerts
      const { data: alerts } = await supabase
        .from('anomaly_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (alerts && alerts.length > 0) {
        pdf.setFontSize(16);
        pdf.text('Security Alerts', 14, 55);

        autoTable(pdf, {
          startY: 60,
          head: [['Type', 'Severity', 'Description', 'Status', 'Time']],
          body: alerts.map(a => [
            a.alert_type.replace(/_/g, ' '),
            a.severity.toUpperCase(),
            a.description.substring(0, 40) + '...',
            a.resolved ? 'Resolved' : 'Active',
            format(new Date(a.created_at), 'PP')
          ]),
          theme: 'striped',
          headStyles: { fillColor: [239, 68, 68] },
          styles: { fontSize: 8 },
        });
      }

      // Fetch recent suspicious activity
      const { data: suspiciousLogs } = await supabase
        .from('activity_logs')
        .select('*')
        .in('action', ['access_denied', 'file_deleted', 'impersonate_start'])
        .order('created_at', { ascending: false })
        .limit(30);

      if (suspiciousLogs && suspiciousLogs.length > 0) {
        const finalY = (pdf as any).lastAutoTable.finalY || 100;
        pdf.setFontSize(16);
        pdf.text('Sensitive Activity Log', 14, finalY + 15);

        autoTable(pdf, {
          startY: finalY + 20,
          head: [['Action', 'Resource', 'Time']],
          body: suspiciousLogs.map(log => [
            log.action,
            log.resource_type,
            format(new Date(log.created_at), 'PPp')
          ]),
          theme: 'striped',
          headStyles: { fillColor: [239, 68, 68] },
        });
      }

      pdf.save(`ADFS_Security_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: 'Report Generated',
        description: 'Security report has been downloaded.',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate security report',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="border-primary/30 hover:bg-primary/10"
          disabled={exporting}
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4 mr-2" />
          )}
          Export PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={generateSystemReport}>
          📊 System Overview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={generateUserReport}>
          👥 User Report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={generateSecurityReport}>
          🔒 Security Audit
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}