export interface Domain {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateDomainInput {
  name: string;
  color: string;
  icon?: string | null;
  sort_order?: number;
}

export interface UpdateDomainInput {
  name?: string;
  color?: string;
  icon?: string | null;
  sort_order?: number;
}
