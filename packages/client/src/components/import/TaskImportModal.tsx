import { useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';
import { useUIStore } from '../../stores/ui.store';
import type { TaskStatusDTO } from '@pm/shared';
import { TaskPriority } from '@pm/shared';
import * as XLSX from 'xlsx';

// ── Types ─────────────────────────────────────────────────────────────

interface ParsedTask {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  statusName: string;
  selected: boolean;
}

interface TaskImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'done';

// ── Parser Utilities ──────────────────────────────────────────────────

function parsePriorityText(text: string): TaskPriority {
  const lower = text.toLowerCase().trim();
  if (/urgent|critical|p0/i.test(lower)) return TaskPriority.URGENT;
  if (/high|p1|important/i.test(lower)) return TaskPriority.HIGH;
  if (/medium|moderate|p2|normal/i.test(lower)) return TaskPriority.MEDIUM;
  if (/low|minor|p3/i.test(lower)) return TaskPriority.LOW;
  return TaskPriority.NONE;
}

function parseDateText(text: string): string {
  if (!text || !text.trim()) return '';
  const trimmed = text.trim();

  // Try parsing as date directly
  const date = new Date(trimmed);
  if (!isNaN(date.getTime()) && date.getFullYear() > 1990) {
    return date.toISOString().split('T')[0];
  }

  // Try common formats: DD/MM/YYYY, MM/DD/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (slashMatch) {
    const [, a, b, yearStr] = slashMatch;
    const year = yearStr.length === 2 ? 2000 + parseInt(yearStr) : parseInt(yearStr);
    // Assume MM/DD/YYYY format
    const month = parseInt(a);
    const day = parseInt(b);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }

  return '';
}

function matchStatus(name: string, statuses: TaskStatusDTO[]): TaskStatusDTO | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase().trim();
  // Exact match
  const exact = statuses.find(s => s.name.toLowerCase() === lower);
  if (exact) return exact;
  // Partial match
  const partial = statuses.find(s => s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase()));
  if (partial) return partial;
  // Common mappings
  if (/done|complete|finished|closed/i.test(lower)) {
    return statuses.find(s => s.isFinal);
  }
  if (/todo|new|open|backlog/i.test(lower)) {
    return statuses.find(s => s.sortOrder === 0) || statuses[0];
  }
  if (/progress|doing|active|started/i.test(lower)) {
    return statuses.find(s => !s.isFinal && s.sortOrder > 0);
  }
  return undefined;
}

// ── Excel Parser ──────────────────────────────────────────────────────

function parseExcel(buffer: ArrayBuffer): ParsedTask[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
  if (rows.length === 0) return [];

  // Auto-detect column mapping by header names
  const headers = Object.keys(rows[0]);
  const columnMap = detectColumns(headers);

  return rows
    .map(row => {
      const title = String(row[columnMap.title] || '').trim();
      if (!title) return null;

      return {
        title,
        description: String(row[columnMap.description] || '').trim(),
        priority: parsePriorityText(String(row[columnMap.priority] || '')),
        dueDate: parseDateText(String(row[columnMap.dueDate] || '')),
        statusName: String(row[columnMap.status] || '').trim(),
        selected: true,
      };
    })
    .filter((t): t is ParsedTask => t !== null);
}

function detectColumns(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {
    title: headers[0],
    description: '',
    priority: '',
    dueDate: '',
    status: '',
  };

  for (const h of headers) {
    const lower = h.toLowerCase();
    if (/title|task|name|subject|item/i.test(lower) && !map.title) {
      map.title = h;
    }
    if (/desc|detail|note|body|content/i.test(lower)) {
      map.description = h;
    }
    if (/priority|importance|urgency|level/i.test(lower)) {
      map.priority = h;
    }
    if (/due|deadline|date|end|finish/i.test(lower)) {
      map.dueDate = h;
    }
    if (/status|state|stage|column|phase/i.test(lower)) {
      map.status = h;
    }
  }

  return map;
}

// ── PDF Parser ────────────────────────────────────────────────────────

async function parsePDF(buffer: ArrayBuffer): Promise<ParsedTask[]> {
  // Dynamic import for code splitting
  const pdfjsLib = await import('pdfjs-dist');

  // Use bundled worker via Vite import
  const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }

  return extractTasksFromText(fullText);
}

function extractTasksFromText(text: string): ParsedTask[] {
  const tasks: ParsedTask[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Strategy 1: Look for numbered or bulleted lines
  const taskPattern = /^[\d]+[.):\-]\s*(.+)/;
  const bulletPattern = /^[\u2022\u2023\u25E6\u2043\u2219*\-]\s*(.+)/;

  for (const line of lines) {
    let title = '';

    const numberedMatch = line.match(taskPattern);
    if (numberedMatch) {
      title = numberedMatch[1].trim();
    } else {
      const bulletMatch = line.match(bulletPattern);
      if (bulletMatch) {
        title = bulletMatch[1].trim();
      }
    }

    if (title && title.length >= 3 && title.length <= 500) {
      // Extract inline priority
      let priority = TaskPriority.NONE;
      if (/\b(urgent|critical)\b/i.test(title)) {
        priority = TaskPriority.URGENT;
        title = title.replace(/\s*[\[(]?\b(urgent|critical)\b[\])]?\s*/gi, ' ').trim();
      } else if (/\b(high priority|high)\b/i.test(title)) {
        priority = TaskPriority.HIGH;
        title = title.replace(/\s*[\[(]?\b(high priority|high)\b[\])]?\s*/gi, ' ').trim();
      } else if (/\b(medium|moderate)\b/i.test(title)) {
        priority = TaskPriority.MEDIUM;
        title = title.replace(/\s*[\[(]?\b(medium|moderate)\b[\])]?\s*/gi, ' ').trim();
      } else if (/\b(low priority|low)\b/i.test(title)) {
        priority = TaskPriority.LOW;
        title = title.replace(/\s*[\[(]?\b(low priority|low)\b[\])]?\s*/gi, ' ').trim();
      }

      // Extract inline date
      let dueDate = '';
      const dateInline = title.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      if (dateInline) {
        dueDate = parseDateText(dateInline[1]);
        title = title.replace(dateInline[0], '').trim();
      }

      tasks.push({
        title,
        description: '',
        priority,
        dueDate,
        statusName: '',
        selected: true,
      });
    }
  }

  // Strategy 2: If no tasks found with patterns, treat non-trivial lines as tasks
  if (tasks.length === 0) {
    for (const line of lines) {
      const cleaned = line.trim();
      if (cleaned.length >= 5 && cleaned.length <= 500 && !/^(page|table|figure|chapter|section|\d+$)/i.test(cleaned)) {
        tasks.push({
          title: cleaned,
          description: '',
          priority: TaskPriority.NONE,
          dueDate: '',
          statusName: '',
          selected: true,
        });
      }
    }
  }

  return tasks;
}

// ── Priority Config ───────────────────────────────────────────────────

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  URGENT: { label: 'Urgent', color: '#EF4444' },
  HIGH: { label: 'High', color: '#F97316' },
  MEDIUM: { label: 'Medium', color: '#EAB308' },
  LOW: { label: 'Low', color: '#22C55E' },
  NONE: { label: 'None', color: '#6B7280' },
};

// ── Component ─────────────────────────────────────────────────────────

export function TaskImportModal({ isOpen, onClose, projectId }: TaskImportModalProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore(s => s.addToast);
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [importResults, setImportResults] = useState({ success: 0, failed: 0 });
  const [isDragOver, setIsDragOver] = useState(false);

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => tasksApi.getStatuses(projectId),
    enabled: isOpen,
  });

  const reset = useCallback(() => {
    setStep('upload');
    setParsedTasks([]);
    setFileName('');
    setParseError('');
    setImporting(false);
    setProgress({ done: 0, total: 0 });
    setImportResults({ success: 0, failed: 0 });
    setIsDragOver(false);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const processFile = useCallback(async (file: File) => {
    setParseError('');
    setFileName(file.name);

    const ext = file.name.toLowerCase().split('.').pop();
    if (!ext || !['xlsx', 'xls', 'csv', 'pdf'].includes(ext)) {
      setParseError('Unsupported file type. Please upload an Excel (.xlsx, .xls, .csv) or PDF file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setParseError('File size exceeds 10 MB limit.');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      let tasks: ParsedTask[];

      if (ext === 'pdf') {
        tasks = await parsePDF(buffer);
      } else {
        tasks = parseExcel(buffer);
      }

      if (tasks.length === 0) {
        setParseError('No tasks could be extracted from this file. For Excel files, ensure the first row contains headers (e.g., Title, Description, Priority, Due Date). For PDFs, ensure tasks are listed as numbered or bulleted items.');
        return;
      }

      setParsedTasks(tasks);
      setStep('preview');
    } catch (err) {
      console.error('Parse error:', err);
      setParseError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const toggleTask = useCallback((index: number) => {
    setParsedTasks(prev => prev.map((t, i) => i === index ? { ...t, selected: !t.selected } : t));
  }, []);

  const toggleAll = useCallback(() => {
    const allSelected = parsedTasks.every(t => t.selected);
    setParsedTasks(prev => prev.map(t => ({ ...t, selected: !allSelected })));
  }, [parsedTasks]);

  const updateTask = useCallback((index: number, field: keyof ParsedTask, value: unknown) => {
    setParsedTasks(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  }, []);

  const handleImport = useCallback(async () => {
    const selected = parsedTasks.filter(t => t.selected);
    if (selected.length === 0) return;

    setStep('importing');
    setImporting(true);
    setProgress({ done: 0, total: selected.length });

    const defaultStatus = statuses[0];
    if (!defaultStatus) {
      addToast({ type: 'error', message: 'No task statuses found in project' });
      setStep('preview');
      setImporting(false);
      return;
    }

    let success = 0;
    let failed = 0;

    for (const task of selected) {
      try {
        const matched = matchStatus(task.statusName, statuses);
        await tasksApi.create(projectId, {
          title: task.title,
          description: task.description ? JSON.stringify({ text: task.description }) : undefined,
          statusId: matched?.id || defaultStatus.id,
          priority: task.priority,
          dueDate: task.dueDate || undefined,
        });
        success++;
      } catch {
        failed++;
      }
      setProgress({ done: success + failed, total: selected.length });
    }

    setImportResults({ success, failed });
    setImporting(false);
    setStep('done');

    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
  }, [parsedTasks, statuses, projectId, queryClient, addToast]);

  if (!isOpen) return null;

  const selectedCount = parsedTasks.filter(t => t.selected).length;

  return (
    <div style={overlayStyle} onClick={handleClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {step === 'upload' && 'Import Tasks'}
            {step === 'preview' && `Preview Tasks (${selectedCount} selected)`}
            {step === 'importing' && 'Importing Tasks...'}
            {step === 'done' && 'Import Complete'}
          </h2>
          <button onClick={handleClose} style={closeButtonStyle}>&times;</button>
        </div>

        {/* Upload Step */}
        {step === 'upload' && (
          <div style={{ padding: '24px' }}>
            <div
              style={{
                ...dropZoneStyle,
                borderColor: isDragOver ? 'var(--color-accent)' : 'var(--color-border)',
                backgroundColor: isDragOver ? 'var(--color-accent-light)' : 'var(--color-bg-secondary)',
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileRef.current?.click()}
            >
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>
                {'\uD83D\uDCC4'}
              </div>
              <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
                Drop your file here or click to browse
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', margin: 0 }}>
                Supports Excel (.xlsx, .xls, .csv) and PDF files - Max 10 MB
              </p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {parseError && (
              <div style={errorStyle}>{parseError}</div>
            )}

            {/* Format Guide */}
            <div style={{ marginTop: '20px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              <p style={{ fontWeight: 600, marginBottom: '8px' }}>Expected formats:</p>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={formatCardStyle}>
                  <strong>Excel / CSV</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                    First row = headers. Columns detected automatically: Title, Description, Priority (Urgent/High/Medium/Low), Due Date, Status
                  </p>
                </div>
                <div style={formatCardStyle}>
                  <strong>PDF</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                    Tasks extracted from numbered lists (1. Task name) or bullet points. Priority and dates parsed from inline text.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                {fileName} - {parsedTasks.length} tasks found
              </span>
              <button
                onClick={toggleAll}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {parsedTasks.every(t => t.selected) ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={reset}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                Choose Different File
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={previewThStyle}></th>
                    <th style={previewThStyle}>Title</th>
                    <th style={{ ...previewThStyle, width: '110px' }}>Priority</th>
                    <th style={{ ...previewThStyle, width: '110px' }}>Due Date</th>
                    <th style={{ ...previewThStyle, width: '120px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedTasks.map((task, i) => (
                    <tr key={i} style={{ opacity: task.selected ? 1 : 0.4 }}>
                      <td style={{ ...previewTdStyle, width: '36px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={task.selected}
                          onChange={() => toggleTask(i)}
                          style={{ accentColor: 'var(--color-accent)' }}
                        />
                      </td>
                      <td style={previewTdStyle}>
                        <input
                          type="text"
                          value={task.title}
                          onChange={e => updateTask(i, 'title', e.target.value)}
                          style={inlineEditStyle}
                        />
                        {task.description && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td style={previewTdStyle}>
                        <select
                          value={task.priority}
                          onChange={e => updateTask(i, 'priority', e.target.value as TaskPriority)}
                          style={{
                            ...selectStyle,
                            color: PRIORITY_LABELS[task.priority]?.color,
                          }}
                        >
                          {Object.entries(PRIORITY_LABELS).map(([key, { label }]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={previewTdStyle}>
                        <input
                          type="date"
                          value={task.dueDate}
                          onChange={e => updateTask(i, 'dueDate', e.target.value)}
                          style={{ ...inlineEditStyle, width: '110px' }}
                        />
                      </td>
                      <td style={previewTdStyle}>
                        <select
                          value={task.statusName}
                          onChange={e => updateTask(i, 'statusName', e.target.value)}
                          style={selectStyle}
                        >
                          <option value="">Default</option>
                          {statuses.map(s => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={footerStyle}>
              <button onClick={handleClose} style={cancelBtnStyle}>Cancel</button>
              <button
                onClick={handleImport}
                disabled={selectedCount === 0}
                style={{
                  ...importBtnStyle,
                  opacity: selectedCount === 0 ? 0.5 : 1,
                  cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Import {selectedCount} Task{selectedCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* Importing Step */}
        {step === 'importing' && (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>
              {importing ? '\u23F3' : '\u2705'}
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', marginBottom: '16px' }}>
              Importing tasks... {progress.done} of {progress.total}
            </p>
            <div style={progressBarContainer}>
              <div
                style={{
                  ...progressBarFill,
                  width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Done Step */}
        {step === 'done' && (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {importResults.failed === 0 ? '\u2705' : '\u26A0\uFE0F'}
            </div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--color-text-primary)' }}>
              Import Complete
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>
              {importResults.success} task{importResults.success !== 1 ? 's' : ''} imported successfully
            </p>
            {importResults.failed > 0 && (
              <p style={{ fontSize: '14px', color: 'var(--color-danger)', margin: '0 0 16px' }}>
                {importResults.failed} task{importResults.failed !== 1 ? 's' : ''} failed to import
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '24px' }}>
              <button onClick={reset} style={cancelBtnStyle}>Import More</button>
              <button onClick={handleClose} style={importBtnStyle}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-bg-primary)',
  borderRadius: 'var(--radius-lg)',
  width: '820px',
  maxWidth: '95vw',
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: 'var(--shadow-xl)',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderBottom: '1px solid var(--color-border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '24px',
  cursor: 'pointer',
  color: 'var(--color-text-tertiary)',
  padding: '4px 8px',
  lineHeight: 1,
};

const dropZoneStyle: React.CSSProperties = {
  border: '2px dashed var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '40px 24px',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const errorStyle: React.CSSProperties = {
  marginTop: '12px',
  padding: '10px 14px',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-danger-light)',
  color: 'var(--color-danger)',
  fontSize: '13px',
};

const formatCardStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-bg-tertiary)',
  border: '1px solid var(--color-border)',
};

const previewThStyle: React.CSSProperties = {
  padding: '10px 8px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderBottom: '2px solid var(--color-border)',
  position: 'sticky',
  top: 0,
  backgroundColor: 'var(--color-bg-primary)',
  zIndex: 1,
};

const previewTdStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderBottom: '1px solid var(--color-border)',
  fontSize: '13px',
  verticalAlign: 'middle',
};

const inlineEditStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 6px',
  fontSize: '13px',
  border: '1px solid transparent',
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-primary)',
  outline: 'none',
  transition: 'border-color 0.15s',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 6px',
  fontSize: '12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'var(--color-bg-primary)',
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
};

const footerStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderTop: '1px solid var(--color-border)',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: '13px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
};

const importBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  fontSize: '13px',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-accent)',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 600,
};

const progressBarContainer: React.CSSProperties = {
  width: '100%',
  maxWidth: '400px',
  height: '8px',
  backgroundColor: 'var(--color-bg-tertiary)',
  borderRadius: '4px',
  overflow: 'hidden',
  margin: '0 auto',
};

const progressBarFill: React.CSSProperties = {
  height: '100%',
  backgroundColor: 'var(--color-accent)',
  borderRadius: '4px',
  transition: 'width 0.3s ease',
};
