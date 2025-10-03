import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Trash2, Archive, MoreVertical, FileText, Image, File } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface FileListProps {
  searchQuery: string;
  selectedTags: string[];
  selectedFolder: string | null;
  refreshTrigger: number;
}

interface FileItem {
  id: string;
  filename: string;
  original_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
  tags: string[];
  folders: string[];
}

export function FileList({ searchQuery, selectedTags, selectedFolder, refreshTrigger }: FileListProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadFiles();
  }, [searchQuery, selectedTags, selectedFolder, refreshTrigger]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('files')
        .select('*')
        .eq('is_deleted', false)
        .order('uploaded_at', { ascending: false });

      // Apply filters
      if (searchQuery) {
        query = query.or(`original_name.ilike.%${searchQuery}%,ocr_text.ilike.%${searchQuery}%`);
      }

      if (selectedFolder) {
        query = query.contains('folders', [selectedFolder]);
      }

      if (selectedTags.length > 0) {
        query = query.overlaps('tags', selectedTags);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFiles(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading files',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (file: FileItem) => {
    try {
      const { data, error } = await supabase.storage
        .from('files')
        .download(file.storage_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Download started',
        description: file.original_name,
      });
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const archiveFile = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq('id', fileId);

      if (error) throw error;

      toast({
        title: 'File archived',
        description: 'File has been moved to archives',
      });
      loadFiles();
    } catch (error: any) {
      toast({
        title: 'Archive failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-1">No files found</p>
          <p className="text-sm text-muted-foreground">
            Upload files to get started or adjust your filters
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {files.map((file) => (
        <Card key={file.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 text-muted-foreground">
                {getFileIcon(file.mime_type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{file.original_name}</h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span>{formatFileSize(file.file_size)}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true })}</span>
                </div>
                {file.tags.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {file.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => downloadFile(file)}
                >
                  <Download className="h-4 w-4" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => archiveFile(file.id)}>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
