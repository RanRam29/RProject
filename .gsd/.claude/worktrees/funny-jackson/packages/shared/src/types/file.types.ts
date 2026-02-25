export interface FileDTO {
  id: string;
  projectId: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  createdAt: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
}

export interface RegisterFileRequest {
  originalName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
}
