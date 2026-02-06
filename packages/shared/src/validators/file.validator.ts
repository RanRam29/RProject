import { z } from 'zod';

export const registerFileSchema = z.object({
  originalName: z.string().min(1, 'File name is required').max(500),
  storagePath: z.string().min(1, 'Storage path is required'),
  mimeType: z.string().min(1, 'MIME type is required'),
  sizeBytes: z.number().int().positive('File size must be positive'),
});

export const requestUploadUrlSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(500),
  mimeType: z.string().min(1, 'MIME type is required'),
});
