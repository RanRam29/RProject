export interface DefaultStatusConfig {
  name: string;
  color: string;
  sortOrder: number;
  isFinal: boolean;
}

export interface DefaultLabelConfig {
  name: string;
  color: string;
}

export interface SystemDefaultsDTO {
  statuses: DefaultStatusConfig[];
  labels: DefaultLabelConfig[];
}
