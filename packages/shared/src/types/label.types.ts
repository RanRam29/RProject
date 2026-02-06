export interface LabelDTO {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface TaskLabelDTO {
  id: string;
  taskId: string;
  labelId: string;
  label?: LabelDTO;
}

export interface CreateLabelRequest {
  name: string;
  color?: string;
}

export interface UpdateLabelRequest {
  name?: string;
  color?: string;
}
