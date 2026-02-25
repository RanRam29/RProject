import { z } from 'zod';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Allowed MIME types whitelist
const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/markdown',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Archives
  'application/zip',
  'application/gzip',
  // JSON/XML
  'application/json',
  'application/xml',
  'text/xml',
];

const mimeTypeValidator = z.string().min(1, 'MIME type is required').refine(
  (val) => ALLOWED_MIME_TYPES.includes(val),
  { message: `File type not allowed. Accepted types: images, documents, spreadsheets, PDFs, archives` },
);

export const registerFileSchema = z.object({
  originalName: z.string().min(1, 'File name is required').max(500),
  storagePath: z.string().min(1, 'Storage path is required'),
  mimeType: mimeTypeValidator,
  sizeBytes: z.number().int().positive('File size must be positive').max(MAX_FILE_SIZE, 'File size exceeds 10 MB limit'),
});

export const requestUploadUrlSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(500),
  mimeType: mimeTypeValidator,
});
