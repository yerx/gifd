export interface InboxItemData {
  id: string;
  type: string;
  raw_text: string | null;
  quick_note: string | null;
  audio_path: string | null;
  photo_path: string | null;
  ocr_text: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface MaterialData {
  id: string;
  name: string;
  project_id: string;
  status: string;
}

export interface DomainData {
  id: string;
  name: string;
  color: string;
}

export interface ProjectData {
  id: string;
  domain_id: string;
  name: string;
}

export type ProcessingAction = null | 'create_task' | 'someday_maybe' | 'do_it_now';

export type BatchGroup = {
  type: string;
  items: InboxItemData[];
};
