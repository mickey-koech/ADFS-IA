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
      // Create unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create file metadata record
      const { error: dbError } = await supabase
        .from('files')
        .insert({
          filename: fileName,
          original_name: file.name,
          storage_path: fileName,
          mime_type: file.type,
          file_size: file.size,
          uploaded_by: user!.id,
        });

      if (dbError) throw dbError;

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
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Upload Files</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop files here, or click to browse
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
