export type AttachmentType = "photo" | "audio" | "document" | "other";

export interface Attachment {
  id: string;
  type: AttachmentType;
  file_path: string;
  file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  task_id: string | null;
  project_id: string | null;
  inbox_item_id: string | null;
  material_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateAttachmentInput {
  type: AttachmentType;
  file_path: string;
  file_name?: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  task_id?: string | null;
  project_id?: string | null;
  inbox_item_id?: string | null;
  material_id?: string | null;
  sort_order?: number;
}

export interface UpdateAttachmentInput {
  file_name?: string | null;
  mime_type?: string | null;
  sort_order?: number;
}
