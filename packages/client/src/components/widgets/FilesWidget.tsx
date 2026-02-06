import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesApi } from '../../api/files.api';
import { useUIStore } from '../../stores/ui.store';
import type { WidgetProps } from './widget.types';

const FILE_ICONS: Record<string, string> = {
  'application/pdf': '\uD83D\uDCC4',
  'image/png': '\uD83D\uDDBC',
  'image/jpeg': '\uD83D\uDDBC',
  'image/gif': '\uD83D\uDDBC',
  'image/svg+xml': '\uD83D\uDDBC',
  'text/plain': '\uD83D\uDCC3',
  'text/csv': '\uD83D\uDCCA',
  'application/zip': '\uD83D\uDCE6',
  'application/json': '\uD83D\uDCCB',
  'application/vnd.ms-excel': '\uD83D\uDCCA',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '\uD83D\uDCCA',
  'application/msword': '\uD83D\uDCC4',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '\uD83D\uDCC4',
  default: '\uD83D\uDCC1',
};

function getFileIcon(mimeType: string): string {
  return FILE_ICONS[mimeType] || FILE_ICONS.default;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesWidget({ projectId }: WidgetProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['files', projectId],
    queryFn: () => filesApi.list(projectId),
  });

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

  const handleDownload = useCallback(
    async (fileId: string, fileName: string) => {
      try {
        const url = await filesApi.getDownloadUrl(projectId, fileId);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
      } catch {
        addToast({ type: 'error', message: 'Failed to get download URL' });
      }
    },
    [projectId, addToast]
  );

  const handleUpload = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      setUploading(true);

      try {
        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          // Get pre-signed upload URL
          const { uploadUrl, fileKey } = await filesApi.getUploadUrl(
            projectId,
            file.name,
            file.type || 'application/octet-stream'
          );

          // Upload to S3/storage
          await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
          });

          // Register file in DB
          await filesApi.registerFile(projectId, {
            originalName: file.name,
            storagePath: fileKey,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
          });
        }

        queryClient.invalidateQueries({ queryKey: ['files', projectId] });
        addToast({
          type: 'success',
          message: `${fileList.length} file${fileList.length > 1 ? 's' : ''} uploaded`,
        });
      } catch (err: any) {
        addToast({
          type: 'error',
          message: err?.response?.data?.error || 'Upload failed. Check server configuration.',
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

  const containerStyle: React.CSSProperties = {
    padding: '12px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const dropZoneStyle: React.CSSProperties = {
    border: `2px dashed ${dragOver ? 'var(--color-accent)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    backgroundColor: dragOver ? 'var(--color-accent-light)' : 'transparent',
    fontSize: '13px',
    color: dragOver ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
  };

  const fileRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-elevated)',
    transition: 'background var(--transition-fast)',
  };

  const actionBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
    transition: 'all var(--transition-fast)',
  };

  if (isLoading) {
    return (
      <div style={{ ...containerStyle, alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>Loading files...</span>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {files.length} file{files.length !== 1 ? 's' : ''}
        </span>
        <button
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1,
          }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* Drop zone */}
      <div
        style={dropZoneStyle}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {uploading ? 'Uploading files...' : 'Drop files here or click to browse'}
      </div>

      {/* File list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-tertiary)' }}>
            No files uploaded yet
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              style={fileRowStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
              }}
            >
              <span style={{ fontSize: '20px' }}>{getFileIcon(file.mimeType)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  {file.originalName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                  {formatFileSize(file.sizeBytes)} &middot;{' '}
                  {new Date(file.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                style={actionBtnStyle}
                onClick={() => handleDownload(file.id, file.originalName)}
                title="Download"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                &#8595;
              </button>
              {deleteConfirmId === file.id ? (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button
                    style={{ ...actionBtnStyle, color: 'var(--color-danger)', fontWeight: 600 }}
                    onClick={() => deleteMutation.mutate(file.id)}
                  >
                    Yes
                  </button>
                  <button
                    style={actionBtnStyle}
                    onClick={() => setDeleteConfirmId(null)}
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  style={{ ...actionBtnStyle, color: 'var(--color-danger)' }}
                  onClick={() => setDeleteConfirmId(file.id)}
                  title="Delete"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-danger-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  &#215;
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
