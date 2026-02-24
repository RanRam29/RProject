export interface LaneDTO {
  id: string;
  projectId: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
}

export interface CreateLaneRequest {
  name: string;
  color?: string;
}

export interface UpdateLaneRequest {
  name?: string;
  color?: string;
  sortOrder?: number;
}
