export interface Tag {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateTagInput {
  name: string;
  color?: string | null;
  sort_order?: number;
}

export interface UpdateTagInput {
  name?: string;
  color?: string | null;
  sort_order?: number;
}
