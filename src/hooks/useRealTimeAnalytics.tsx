import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, subDays, format } from 'date-fns';

interface UploadFrequency {
  date: string;
  uploads: number;
}

interface FileTypeDistribution {
  name: string;
  value: number;
  color: string;
}

interface DepartmentActivity {
  department: string;
  uploads: number;
  downloads: number;
}

interface RecentUpload {
  id: string;
  fileName: string;
  user: string;
  department: string;
  size: string;
  status: 'pending' | 'reviewed' | 'flagged';
  timestamp: string;
}

interface SummaryStats {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: any;
  color: string;
}

export function useRealTimeAnalytics() {
  const [uploadFrequency, setUploadFrequency] = useState<UploadFrequency[]>([]);
  const [fileTypeDistribution, setFileTypeDistribution] = useState<FileTypeDistribution[]>([]);
  const [departmentActivity, setDepartmentActivity] = useState<DepartmentActivity[]>([]);
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllAnalytics();
    
    // Subscribe to real-time file changes
    const filesChannel = supabase
      .channel('files-analytics')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'files' },
        () => {
          fetchAllAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(filesChannel);
    };
  }, []);

  const fetchAllAnalytics = async () => {
    try {
      await Promise.all([
        fetchUploadFrequency(),
        fetchFileTypeDistribution(),
        fetchDepartmentActivity(),
        fetchRecentUploads(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUploadFrequency = async () => {
    const days = 7;
    const results: UploadFrequency[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const startOfCurrentDay = startOfDay(day);
      const endOfCurrentDay = new Date(startOfCurrentDay);
      endOfCurrentDay.setDate(endOfCurrentDay.getDate() + 1);

      const { count } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .gte('uploaded_at', startOfCurrentDay.toISOString())
        .lt('uploaded_at', endOfCurrentDay.toISOString());

      results.push({
        date: format(day, 'MM/dd'),
        uploads: count || 0
      });
    }
    
    setUploadFrequency(results);
  };

  const fetchFileTypeDistribution = async () => {
    const { data } = await supabase
      .from('files')
      .select('mime_type')
      .eq('is_deleted', false);

    if (!data) return;

    const typeCount: Record<string, number> = {};
    data.forEach(f => {
      const ext = f.mime_type?.split('/')[1]?.toUpperCase() || 'Unknown';
      const normalized = ext === 'VND.OPENXMLFORMATS-OFFICEDOCUMENT.WORDPROCESSINGML.DOCUMENT' ? 'DOCX' :
                        ext === 'VND.OPENXMLFORMATS-OFFICEDOCUMENT.SPREADSHEETML.SHEET' ? 'XLSX' :
                        ext === 'VND.MS-EXCEL' ? 'XLS' :
                        ext.length > 10 ? ext.substring(0, 8) : ext;
      typeCount[normalized] = (typeCount[normalized] || 0) + 1;
    });

    const colors = [
      'hsl(var(--primary))',
      'hsl(var(--secondary))',
      'hsl(var(--accent))',
      'hsl(142, 76%, 36%)',
      'hsl(38, 92%, 50%)',
      'hsl(280, 65%, 60%)',
    ];

    const distribution = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }));

    setFileTypeDistribution(distribution);
  };

  const fetchDepartmentActivity = async () => {
    // Fetch uploads by department
    const { data: uploads } = await supabase
      .from('files')
      .select(`
        uploaded_by,
        profiles!inner(department_id, departments(name))
      `)
      .eq('is_deleted', false);

    // Fetch downloads (activity logs)
    const { data: downloads } = await supabase
      .from('activity_logs')
      .select(`
        user_id,
        profiles!inner(department_id, departments(name))
      `)
      .eq('action', 'file_viewed');

    const deptStats: Record<string, { uploads: number; downloads: number }> = {};

    uploads?.forEach((file: any) => {
      const deptName = file.profiles?.departments?.name || 'Unassigned';
      if (!deptStats[deptName]) deptStats[deptName] = { uploads: 0, downloads: 0 };
      deptStats[deptName].uploads++;
    });

    downloads?.forEach((log: any) => {
      const deptName = log.profiles?.departments?.name || 'Unassigned';
      if (!deptStats[deptName]) deptStats[deptName] = { uploads: 0, downloads: 0 };
      deptStats[deptName].downloads++;
    });

    const activity = Object.entries(deptStats)
      .map(([department, stats]) => ({ department, ...stats }))
      .sort((a, b) => b.uploads - a.uploads)
      .slice(0, 6);

    setDepartmentActivity(activity);
  };

  const fetchRecentUploads = async () => {
    const { data } = await supabase
      .from('files')
      .select(`
        id,
        original_name,
        file_size,
        uploaded_at,
        duplicate_status,
        ocr_status,
        profiles!inner(full_name, departments(name))
      `)
      .eq('is_deleted', false)
      .order('uploaded_at', { ascending: false })
      .limit(10);

    if (!data) return;

    const uploads: RecentUpload[] = data.map((f: any) => ({
      id: f.id,
      fileName: f.original_name,
      user: f.profiles?.full_name || 'Unknown',
      department: f.profiles?.departments?.name || 'Unassigned',
      size: formatFileSize(f.file_size),
      status: f.duplicate_status === 'suggested' ? 'flagged' : 
              f.ocr_status === 'done' ? 'reviewed' : 'pending',
      timestamp: f.uploaded_at
    }));

    setRecentUploads(uploads);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return {
    uploadFrequency,
    fileTypeDistribution,
    departmentActivity,
    recentUploads,
    loading,
    refetch: fetchAllAnalytics
  };
}