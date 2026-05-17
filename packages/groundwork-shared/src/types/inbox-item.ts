export type InboxItemType = "text" | "voice" | "photo";

export interface InboxItem {
  id: string;
  type: InboxItemType;
  raw_text: string | null;
  audio_path: string | null;
  photo_path: string | null;
  ocr_text: string | null;
  quick_note: string | null;
  processed_at: string | null;
  processed_to_task_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateInboxItemInput {
  type: InboxItemType;
  raw_text?: string | null;
  audio_path?: string | null;
  photo_path?: string | null;
  ocr_text?: string | null;
  quick_note?: string | null;
}

export interface UpdateInboxItemInput {
  raw_text?: string | null;
  audio_path?: string | null;
  photo_path?: string | null;
  ocr_text?: string | null;
  quick_note?: string | null;
  processed_at?: string | null;
  processed_to_task_id?: string | null;
}
