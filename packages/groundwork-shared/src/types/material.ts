export type MaterialStatus = "needed" | "ordered" | "acquired";

export interface Material {
  id: string;
  project_id: string;
  name: string;
  quantity: number;
  unit_cost: number | null;
  source: string | null;
  status: MaterialStatus;
  blocks_tasks: string; // JSON array of task ULIDs
  photo_path: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateMaterialInput {
  project_id: string;
  name: string;
  quantity?: number;
  unit_cost?: number | null;
  source?: string | null;
  status?: MaterialStatus;
  blocks_tasks?: string[];
  photo_path?: string | null;
  notes?: string | null;
  sort_order?: number;
}

export interface UpdateMaterialInput {
  project_id?: string;
  name?: string;
  quantity?: number;
  unit_cost?: number | null;
  source?: string | null;
  status?: MaterialStatus;
  blocks_tasks?: string[];
  photo_path?: string | null;
  notes?: string | null;
  sort_order?: number;
}
