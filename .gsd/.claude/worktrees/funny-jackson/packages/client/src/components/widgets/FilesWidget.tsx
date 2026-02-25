import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesApi } from '../../api/files.api';
import { useUIStore } from '../../stores/ui.store';
import { FilePreviewModal } from '../file/FilePreviewModal';
import type { WidgetProps } from './widget.types';
import type { FileDTO } from '@pm/shared';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const FILE_ICONS: Record<string, string> = {
  'application/pdf': '\uD83D\uDCC4',
  'image/png': '\uD83D\uDDBC',
  'image/jpeg': '\uD83D\uDDBC',
  'image/gif': '\uD83D\uDDBC',
  'image/svg+xml': '\uD83D\uDDBC',
  'image/webp': '\uD83D\uDDBC',
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

type FilterType = 'all' | 'images' | 'documents' | 'other';

function getFileIcon(mimeType: string): string {
  return FILE_ICONS[mimeType] || FILE_ICONS.default;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function matchesFilter(file: FileDTO, filter: FilterType): boolean {
  if (filter === 'all') return true;
  if (filter === 'images') return file.mimeType.startsWith('image/');
  if (filter === 'documents') {
    return file.mimeType === 'application/pdf' ||
      file.mimeType.startsWith('text/') ||
      file.mimeType.includes('document') ||
      file.mimeType.includes('spreadsheet') ||
      file.mimeType === 'application/json';
  }
  // 'other'
  return !file.mimeType.startsWith('image/') &&
    file.mimeType !== 'application/pdf' &&
    !file.mimeType.startsWith('text/') &&
    !file.mimeType.includes('document') &&
    !file.mimeType.includes('spreadsheet') &&
    file.mimeType !== 'application/json';
}

function canPreview(mimeType: string): boolean {
  return mimeType.startsWith('image/') ||
    mimeType === 'application/pdf' ||
    mimeType.startsWith('text/') ||
    mimeType === 'application/json';
}

export function FilesWidget({ projectId }: WidgetProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [previewFile, setPreviewFile] = useState<{ file: FileDTO; url: string } | null>(null);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['files', projectId],
    queryFn: () => filesApi.list(projectId),
  });

  const filteredFiles = files.filter((f) => matchesFilter(f, filter));

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

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? 'var(--color-accent)' : 'transparent',
    color: active ? 'white' : 'var(--color-text-secondary)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '11px',
    padding: '3px 8px',
    borderRadius: 'var(--radius-full)',
    transition: 'all var(--transition-fast)',
    fontWeight: active ? 600 : 400,
  });

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
          {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
          {filter !== 'all' && ` (${filter})`}
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

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {(['all', 'images', 'documents', 'other'] as FilterType[]).map((f) => (
          <button key={f} style={filterBtnStyle(filter === f)} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {uploading ? 'Uploading files...' : 'Drop files here or click to browse (max 10 MB)'}
      </div>

      {/* File list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filteredFiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-tertiary)' }}>
            {filter === 'all' ? 'No files uploaded yet' : `No ${filter} files`}
          </div>
        ) : (
          filteredFiles.map((file) => (
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
                    cursor: canPreview(file.mimeType) ? 'pointer' : 'default',
                    color: canPreview(file.mimeType) ? 'var(--color-accent)' : 'var(--color-text-primary)',
                  }}
                  onClick={() => canPreview(file.mimeType) && handlePreview(file)}
                  title={canPreview(file.mimeType) ? 'Click to preview' : file.originalName}
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
