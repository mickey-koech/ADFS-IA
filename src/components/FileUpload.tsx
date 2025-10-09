import { useState, useCallback } from 'react';
import { Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface FileUploadProps {
  onUploadComplete: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const uploadFile = async (file: File, index: number) => {
    try {
      // Update progress: 10%
      setUploadingFiles(prev =>
        prev.map((f, i) => i === index ? { ...f, progress: 10 } : f)
      );

      // Create unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Update progress: 50%
      setUploadingFiles(prev =>
        prev.map((f, i) => i === index ? { ...f, progress: 50 } : f)
      );

      // Create file metadata record
      const { data: fileRecord, error: dbError } = await supabase
        .from('files')
        .insert({
          filename: fileName,
          original_name: file.name,
          storage_path: fileName,
          mime_type: file.type,
          file_size: file.size,
          uploaded_by: user!.id,
          content_hash: `hash-${Date.now()}-${Math.random()}`,
          ocr_status: 'pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Update progress: 70%
      setUploadingFiles(prev =>
        prev.map((f, i) => i === index ? { ...f, progress: 70 } : f)
      );

      // Trigger AI processing in background (don't wait)
      supabase.functions.invoke('process-file-ai', {
        body: { fileId: fileRecord.id }
      }).then(({ error }) => {
        if (error) console.warn('AI processing queued with warning:', error);
      });

      // Trigger duplicate detection in background
      supabase.functions.invoke('detect-duplicates', {
        body: { fileId: fileRecord.id }
      }).then(({ error }) => {
        if (error) console.warn('Duplicate detection queued with warning:', error);
      });

      // Update progress: 100%
      setUploadingFiles(prev =>
        prev.map((f, i) =>
          i === index ? { ...f, progress: 100, status: 'success' as const } : f
        )
      );
    } catch (error: any) {
      setUploadingFiles(prev =>
        prev.map((f, i) =>
          i === index ? { ...f, status: 'error' as const, error: error.message } : f
        )
      );
    }
  };

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const newFiles: UploadingFile[] = Array.from(files).map(file => ({
        file,
        progress: 0,
        status: 'uploading' as const,
      }));

      setUploadingFiles(prev => [...prev, ...newFiles]);

      // Upload files
      const startIndex = uploadingFiles.length;
      for (let i = 0; i < newFiles.length; i++) {
        await uploadFile(newFiles[i].file, startIndex + i);
      }

      // Notify parent after all uploads complete
      setTimeout(() => {
        onUploadComplete();
        toast({
          title: 'Upload complete',
          description: `${newFiles.length} file(s) uploaded successfully`,
        });
      }, 500);
    },
    [uploadingFiles.length, toast, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-accent bg-accent/5'
              : 'border-accent/30 hover:border-accent/50'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-accent mb-4" />
          <h3 className="text-lg font-serif mb-2">Upload Documents</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop files here, or click to browse • AI processing included
          </p>
          <Button
            onClick={() => document.getElementById('file-upload')?.click()}
            variant="outline"
          >
            Browse Files
          </Button>
          <input
            id="file-upload"
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp"
          />
        </div>

        {uploadingFiles.length > 0 && (
          <div className="mt-6 space-y-3">
            {uploadingFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{file.file.name}</p>
                    {file.status === 'success' && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                  </div>
                  {file.status === 'uploading' && (
                    <Progress value={file.progress} className="h-1" />
                  )}
                  {file.status === 'error' && (
                    <p className="text-xs text-destructive">{file.error}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
