import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Scan,
  Copy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'scanning' | 'duplicate-found' | 'success' | 'error';
  error?: string;
  duplicates?: Array<{
    id: string;
    original_name: string;
    similarity: number;
  }>;
}

interface SmartUploadProps {
  onUploadComplete?: () => void;
}

export function SmartUpload({ onUploadComplete }: SmartUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [duplicateDialog, setDuplicateDialog] = useState<{
    open: boolean;
    fileIndex: number;
    duplicates: Array<{ id: string; original_name: string; similarity: number }>;
  }>({ open: false, fileIndex: -1, duplicates: [] });
  const { user } = useAuth();
  const { toast } = useToast();

  const checkForDuplicates = async (file: File, fileIndex: number): Promise<boolean> => {
    try {
      // Update status to scanning
      setUploadingFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, status: 'scanning' as const, progress: 50 } : f
      ));

      // Get content hash by reading first chunk of file
      const chunk = file.slice(0, 1024 * 1024); // First 1MB
      const buffer = await chunk.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Check for exact duplicates by content hash
      const { data: exactDuplicates } = await supabase
        .from('files')
        .select('id, original_name')
        .eq('content_hash', contentHash)
        .eq('is_deleted', false)
        .limit(5);

      if (exactDuplicates && exactDuplicates.length > 0) {
        const duplicates = exactDuplicates.map(d => ({
          id: d.id,
          original_name: d.original_name,
          similarity: 100
        }));

        setUploadingFiles(prev => prev.map((f, i) => 
          i === fileIndex ? { ...f, status: 'duplicate-found' as const, duplicates } : f
        ));

        setDuplicateDialog({
          open: true,
          fileIndex,
          duplicates
        });

        return true;
      }

      // Check for similar files by name
      const { data: similarFiles } = await supabase
        .from('files')
        .select('id, original_name')
        .ilike('original_name', `%${file.name.split('.')[0]}%`)
        .eq('is_deleted', false)
        .limit(5);

      if (similarFiles && similarFiles.length > 0) {
        const duplicates = similarFiles.map(d => ({
          id: d.id,
          original_name: d.original_name,
          similarity: calculateSimilarity(file.name, d.original_name)
        })).filter(d => d.similarity > 70);

        if (duplicates.length > 0) {
          setUploadingFiles(prev => prev.map((f, i) => 
            i === fileIndex ? { ...f, status: 'duplicate-found' as const, duplicates } : f
          ));

          setDuplicateDialog({
            open: true,
            fileIndex,
            duplicates
          });

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return false;
    }
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 100;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 100;
    
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++;
    }
    
    return Math.round((matches / longer.length) * 100);
  };

  const uploadFile = async (file: File, fileIndex: number, skipDuplicateCheck = false) => {
    if (!user) return;

    try {
      // Check for duplicates first (unless skipped)
      if (!skipDuplicateCheck) {
        const hasDuplicates = await checkForDuplicates(file, fileIndex);
        if (hasDuplicates) return;
      }

      setUploadingFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, status: 'uploading' as const, progress: 60 } : f
      ));

      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Generate content hash
      const chunk = file.slice(0, 1024 * 1024);
      const buffer = await chunk.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadingFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, progress: 80 } : f
      ));

      // Insert file record
      const { data: fileRecord, error: dbError } = await supabase
        .from('files')
        .insert({
          filename: fileName,
          original_name: file.name,
          storage_path: filePath,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          uploaded_by: user.id,
          content_hash: contentHash,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setUploadingFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, progress: 90 } : f
      ));

      // Trigger AI processing
      const session = await supabase.auth.getSession();
      await supabase.functions.invoke('process-file-ai', {
        body: { fileId: fileRecord.id },
        headers: { Authorization: `Bearer ${session.data.session?.access_token}` }
      });

      setUploadingFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, status: 'success' as const, progress: 100 } : f
      ));

      toast({
        title: 'File Uploaded',
        description: `${file.name} has been uploaded and is being processed by AI.`,
      });

      onUploadComplete?.();
    } catch (error: any) {
      setUploadingFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, status: 'error' as const, error: error.message } : f
      ));

      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleFiles = useCallback((files: FileList) => {
    const newFiles: UploadingFile[] = Array.from(files).map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploadingFiles(prev => [...prev, ...newFiles]);

    const startIndex = uploadingFiles.length;
    newFiles.forEach((_, index) => {
      uploadFile(newFiles[index].file, startIndex + index);
    });
  }, [uploadingFiles.length, user]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleContinueUpload = () => {
    const { fileIndex } = duplicateDialog;
    setDuplicateDialog({ open: false, fileIndex: -1, duplicates: [] });
    
    const file = uploadingFiles[fileIndex];
    if (file) {
      uploadFile(file.file, fileIndex, true);
    }
  };

  const handleCancelUpload = () => {
    const { fileIndex } = duplicateDialog;
    setUploadingFiles(prev => prev.filter((_, i) => i !== fileIndex));
    setDuplicateDialog({ open: false, fileIndex: -1, duplicates: [] });
  };

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusIcon = (status: UploadingFile['status']) => {
    switch (status) {
      case 'scanning':
        return <Scan className="w-4 h-4 text-primary animate-pulse" />;
      case 'duplicate-found':
        return <Copy className="w-4 h-4 text-warning" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <FileText className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Scan className="w-5 h-5 text-primary" />
            Smart Upload with AI Duplicate Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer",
              isDragging
                ? "border-primary bg-primary/5 scale-[1.02]"
                : "border-primary/20 hover:border-primary/40 hover:bg-secondary/50"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('smart-file-input')?.click()}
          >
            <Upload className={cn(
              "w-12 h-12 mx-auto mb-4 transition-colors",
              isDragging ? "text-primary" : "text-muted-foreground"
            )} />
            <p className="text-lg font-medium mb-1">
              {isDragging ? 'Drop files here' : 'Drag & drop files to upload'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              AI will automatically check for duplicates before uploading
            </p>
            <Button variant="outline" className="border-primary/20">
              Browse Files
            </Button>
            <input
              id="smart-file-input"
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {uploadingFiles.length > 0 && (
            <div className="space-y-3">
              {uploadingFiles.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-primary/10"
                >
                  {getStatusIcon(item.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {item.status === 'scanning' && (
                        <Badge variant="outline" className="text-xs">
                          <Scan className="w-3 h-3 mr-1 animate-spin" />
                          Scanning for duplicates...
                        </Badge>
                      )}
                      {item.status === 'duplicate-found' && (
                        <Badge variant="outline" className="text-xs border-warning text-warning">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Potential duplicates found
                        </Badge>
                      )}
                      {item.status === 'uploading' && (
                        <Progress value={item.progress} className="flex-1 h-1" />
                      )}
                      {item.status === 'success' && (
                        <span className="text-xs text-success">Uploaded successfully</span>
                      )}
                      {item.status === 'error' && (
                        <span className="text-xs text-destructive">{item.error}</span>
                      )}
                    </div>
                  </div>
                  {(item.status === 'success' || item.status === 'error') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeFile(index)}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Duplicate Found Dialog */}
      <AlertDialog open={duplicateDialog.open} onOpenChange={(open) => !open && handleCancelUpload()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Similar Files Already Exist
            </AlertDialogTitle>
            <AlertDialogDescription>
              The file you're trying to upload may already exist in the system. 
              Would you like to continue uploading anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2 py-4">
            <p className="text-sm font-medium">Existing similar files:</p>
            {duplicateDialog.duplicates.map((dup) => (
              <div
                key={dup.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm truncate max-w-[200px]">{dup.original_name}</span>
                </div>
                <Badge variant={dup.similarity === 100 ? 'destructive' : 'secondary'}>
                  {dup.similarity}% match
                </Badge>
              </div>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelUpload}>
              Cancel Upload
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleContinueUpload}>
              Upload Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}