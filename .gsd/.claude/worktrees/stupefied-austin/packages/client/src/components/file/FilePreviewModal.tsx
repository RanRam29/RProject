import { useState, useEffect } from 'react';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  mimeType: string;
  downloadUrl: string;
  fileSize: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilePreviewModal({
  isOpen,
  onClose,
  fileName,
  mimeType,
  downloadUrl,
  fileSize,
}: FilePreviewModalProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const isText = mimeType.startsWith('text/') || mimeType === 'application/json';
  const isPreviewable = isImage || isPdf || isText;

  useEffect(() => {
    if (!isOpen || !isText || !downloadUrl) return;
    setTextContent(null);
    setLoadError(false);

    fetch(downloadUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.text();
      })
      .then(setTextContent)
      .catch(() => setLoadError(true));
  }, [isOpen, isText, downloadUrl]);

  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9500,
    padding: '24px',
    animation: 'fadeIn var(--transition-fast) ease',
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    width: '100%',
    maxWidth: isImage || isPdf ? '900px' : '700px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
  };

  const previewAreaStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-bg-secondary)',
    minHeight: '200px',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '15px', fontWeight: 600,
              color: 'var(--color-text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {fileName}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
              {mimeType} &middot; {formatFileSize(fileSize)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            <a
              href={downloadUrl}
              download={fileName}
              style={{
                padding: '6px 12px', fontSize: '12px', fontWeight: 500,
                backgroundColor: 'var(--color-accent)', color: 'white',
                border: 'none', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </a>
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px', border: 'none',
                borderRadius: 'var(--radius-md)', backgroundColor: 'transparent',
                color: 'var(--color-text-tertiary)', cursor: 'pointer',
                fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div style={previewAreaStyle}>
          {!isPreviewable && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-tertiary)' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}>Preview not available</div>
              <div style={{ fontSize: '12px' }}>Download the file to view it</div>
            </div>
          )}

          {isImage && (
            <img
              src={downloadUrl}
              alt={fileName}
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              onError={() => setLoadError(true)}
            />
          )}

          {isPdf && (
            <iframe
              src={downloadUrl}
              title={fileName}
              style={{ width: '100%', height: '70vh', border: 'none' }}
            />
          )}

          {isText && (
            <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
              {textContent === null && !loadError && (
                <div style={{ padding: '20px', color: 'var(--color-text-tertiary)' }}>Loading...</div>
              )}
              {loadError && (
                <div style={{ padding: '20px', color: 'var(--color-text-tertiary)' }}>
                  Could not load file preview. Download to view.
                </div>
              )}
              {textContent !== null && (
                <pre style={{
                  margin: 0, padding: '16px',
                  fontSize: '13px', lineHeight: 1.5,
                  color: 'var(--color-text-primary)',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  maxHeight: '70vh', overflow: 'auto',
                }}>
                  {textContent}
                </pre>
              )}
            </div>
          )}

          {isImage && loadError && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-tertiary)' }}>
              Failed to load image preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
