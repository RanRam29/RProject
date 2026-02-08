import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesApi } from '../../api/files.api';
import { useUIStore } from '../../stores/ui.store';
import { FilePreviewModal } from './FilePreviewModal';
import type { FileDTO } from '@pm/shared';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface TaskAttachmentsProps {
  projectId: string;
  taskId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '\uD83D\uDDBC';
  if (mimeType === 'application/pdf') return '\uD83D\uDCC4';
  if (mimeType.startsWith('text/')) return '\uD83D\uDCC3';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return '\uD83D\uDCCA';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '\uD83D\uDCE6';
  return '\uD83D\uDCC1';
}

export function TaskAttachments({ projectId, taskId: _taskId }: TaskAttachmentsProps) {
  // _taskId reserved for future task-specific file filtering
  void _taskId;
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ file: FileDTO; url: string } | null>(null);

  const { data: allFiles = [] } = useQuery({
    queryKey: ['files', projectId],
    queryFn: () => filesApi.list(projectId),
  });

  // Filter files that match this task - for now show all project files
  // (task-specific filtering would need a DB column linking files to tasks)
  const files = allFiles;

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => filesApi.delete(projectId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', projectId] });
      addToast({ type: 'success', message: 'File deleted' });
      setDeleteConfirmId(null);
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to delete file' });
    },
  });

  const handlePreview = useCallback(
    async (file: FileDTO) => {
      try {
        const url = await filesApi.getDownloadUrl(projectId, file.id);
        setPreviewFile({ file, url });
      } catch {
        addToast({ type: 'error', message: 'Failed to load preview' });
      }
    },
    [projectId, addToast]
  );

  const handleUpload = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      // Check file size limits
      for (let i = 0; i < fileList.length; i++) {
        if (fileList[i].size > MAX_FILE_SIZE) {
          addToast({
            type: 'error',
            message: `"${fileList[i].name}" exceeds 10 MB limit`,
          });
          return;
        }
      }

      setUploading(true);
      try {
        for (let i = 0; i < fileList.length; i++) {
          await filesApi.upload(projectId, fileList[i]);
        }

        queryClient.invalidateQueries({ queryKey: ['files', projectId] });
        addToast({
          type: 'success',
          message: `${fileList.length} file${fileList.length > 1 ? 's' : ''} uploaded`,
        });
      } catch (err: any) {
        addToast({
          type: 'error',
          message: err?.response?.data?.error || 'Upload failed',
        });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [projectId, queryClient, addToast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload]
  );

  const dropZoneStyle: React.CSSProperties = {
    border: `2px dashed ${dragOver ? 'var(--color-accent)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    padding: '12px',
    textAlign: 'center',
    cursor: uploading ? 'not-allowed' : 'pointer',
    transition: 'all var(--transition-fast)',
    backgroundColor: dragOver ? 'var(--color-accent-light)' : 'transparent',
    fontSize: '12px',
    color: dragOver ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
    opacity: uploading ? 0.6 : 1,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Drop zone */}
      <div
        style={dropZoneStyle}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {uploading ? 'Uploading...' : 'Drop files here or click to attach'}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleUpload(e.target.files)}
      />

      {/* File list */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {files.map((file) => {
            const canPreview = file.mimeType.startsWith('image/') ||
              file.mimeType === 'application/pdf' ||
              file.mimeType.startsWith('text/') ||
              file.mimeType === 'application/json';

            return (
              <div
                key={file.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  fontSize: '12px',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)'; }}
              >
                <span style={{ fontSize: '16px' }}>{getFileIcon(file.mimeType)}</span>
                <div
                  style={{
                    flex: 1, minWidth: 0, cursor: canPreview ? 'pointer' : 'default',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: 'var(--color-text-primary)', fontWeight: 500,
                  }}
                  onClick={() => canPreview && handlePreview(file)}
                  title={canPreview ? 'Click to preview' : file.originalName}
                >
                  {file.originalName}
                </div>
                <span style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                  {formatFileSize(file.sizeBytes)}
                </span>
                {deleteConfirmId === file.id ? (
                  <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                    <button
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '11px', color: 'var(--color-danger)', fontWeight: 600,
                        padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                      }}
                      onClick={() => deleteMutation.mutate(file.id)}
                    >
                      Yes
                    </button>
                    <button
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '11px', color: 'var(--color-text-secondary)',
                        padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                      }}
                      onClick={() => setDeleteConfirmId(null)}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '11px', color: 'var(--color-danger)', padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)', flexShrink: 0,
                    }}
                    onClick={() => setDeleteConfirmId(file.id)}
                    title="Delete"
                  >
                    &times;
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Preview modal */}
      {previewFile && (
        <FilePreviewModal
          isOpen={true}
          onClose={() => setPreviewFile(null)}
          fileName={previewFile.file.originalName}
          mimeType={previewFile.file.mimeType}
          downloadUrl={previewFile.url}
          fileSize={previewFile.file.sizeBytes}
        />
      )}
    </div>
  );
}
