import type {
  Domain, CreateDomainInput, UpdateDomainInput,
  Project, CreateProjectInput, UpdateProjectInput,
  Task, CreateTaskInput, UpdateTaskInput,
  InboxItem, CreateInboxItemInput, UpdateInboxItemInput,
  DailyPlan, CreateDailyPlanInput, UpdateDailyPlanInput,
  TimeBlock, CreateTimeBlockInput, UpdateTimeBlockInput,
  TaskEvent, CreateTaskEventInput,
  Tag, CreateTagInput, UpdateTagInput,
  TaskTag, CreateTaskTagInput,
  Material, CreateMaterialInput, UpdateMaterialInput,
  SeasonalConfig, CreateSeasonalConfigInput, UpdateSeasonalConfigInput,
  CalendarEvent, CreateCalendarEventInput, UpdateCalendarEventInput,
  WeeklyThemeTemplate, CreateWeeklyThemeTemplateInput, UpdateWeeklyThemeTemplateInput,
  WeeklyThemeBlock, CreateWeeklyThemeBlockInput, UpdateWeeklyThemeBlockInput,
  Attachment, CreateAttachmentInput, UpdateAttachmentInput,
} from '@groundwork/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiError(error.error || 'Request failed', response.status);
  }

  return response.json();
}

// Domains
export const domains = {
  list: () => request<Domain[]>('/domains'),
  get: (id: string) => request<Domain>(`/domains/${id}`),
  create: (data: CreateDomainInput) =>
    request<Domain>('/domains', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateDomainInput) =>
    request<Domain>(`/domains/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ deleted: true }>(`/domains/${id}`, { method: 'DELETE' }),
};

// Projects
export const projects = {
  list: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<Project[]>(`/projects${query}`);
  },
  get: (id: string) => request<Project>(`/projects/${id}`),
  create: (data: CreateProjectInput) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateProjectInput) =>
    request<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ deleted: true }>(`/projects/${id}`, { method: 'DELETE' }),
};

// Tasks
export const tasks = {
  list: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<Task[]>(`/tasks${query}`);
  },
  get: (id: string) => request<Task>(`/tasks/${id}`),
  create: (data: CreateTaskInput) =>
    request<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateTaskInput) =>
    request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ deleted: true }>(`/tasks/${id}`, { method: 'DELETE' }),
};

// Inbox
export const inbox = {
  list: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<InboxItem[]>(`/inbox${query}`);
  },
  count: () => request<{ count: number }>('/inbox/count'),
  get: (id: string) => request<InboxItem>(`/inbox/${id}`),
  create: (data: CreateInboxItemInput) =>
    request<InboxItem>('/inbox', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateInboxItemInput) =>
    request<InboxItem>(`/inbox/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ deleted: true }>(`/inbox/${id}`, { method: 'DELETE' }),
};

// Daily Plans
export const dailyPlans = {
  list: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<DailyPlan[]>(`/daily-plans${query}`);
  },
  get: (id: string) => request<DailyPlan>(`/daily-plans/${id}`),
  create: (data: CreateDailyPlanInput) =>
    request<DailyPlan>('/daily-plans', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateDailyPlanInput) =>
    request<DailyPlan>(`/daily-plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ deleted: true }>(`/daily-plans/${id}`, { method: 'DELETE' }),
};

// Time Blocks
export const timeBlocks = {
  list: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<TimeBlock[]>(`/time-blocks${query}`);
  },
  get: (id: string) => request<TimeBlock>(`/time-blocks/${id}`),
  create: (data: CreateTimeBlockInput) =>
    request<TimeBlock>('/time-blocks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateTimeBlockInput) =>
    request<TimeBlock>(`/time-blocks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ deleted: true }>(`/time-blocks/${id}`, { method: 'DELETE' }),
};

// Task Events
export const taskEvents = {
  list: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<TaskEvent[]>(`/task-events${query}`);
  },
  get: (id: string) => request<TaskEvent>(`/task-events/${id}`),
  create: (data: CreateTaskEventInput) =>
    request<TaskEvent>('/task-events', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ deleted: true }>(`/task-events/${id}`, { method: 'DELETE' }),
};

// Tags
export const tags = {
  list: () => request<Tag[]>('/tags'),
  get: (id: string) => request<Tag>(`/tags/${id}`),
  create: (data: CreateTagInput) =>
    request<Tag>('/tags', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateTagInput) =>
    request<Tag>(`/tags/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ deleted: true }>(`/tags/${id}`, { method: 'DELETE' }),
};

// Task Tags
export const taskTags = {
  list: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<TaskTag[]>(`/task-tags${query}`);
  },
  create: (data: CreateTaskTagInput) =>
    request<TaskTag>('/task-tags', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ deleted: true }>(`/task-tags/${id}`, { method: 'DELETE' }),
};

// Materials
export const materials = {
  list: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<Material[]>(`/materials${query}`);
  },
  get: (id: string) => request<Material>(`/materials/${id}`),
  create: (data: CreateMaterialInput) =>
    request<Material>('/materials', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateMaterialInput) =>
    request<Material>(`/materials/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ deleted: true }>(`/materials/${id}`, { method: 'DELETE' }),
};

// Attachments
export const attachments = {
  list: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<Attachment[]>(`/attachments${query}`);
  },
  get: (id: string) => request<Attachment>(`/attachments/${id}`),
  create: (data: CreateAttachmentInput) =>
    request<Attachment>('/attachments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateAttachmentInput) =>
    request<Attachment>(`/attachments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ deleted: true }>(`/attachments/${id}`, { method: 'DELETE' }),
};

// Seasonal Config
export const seasonalConfig = {
  list: () => request<SeasonalConfig[]>('/seasonal-config'),
  get: (id: string) => request<SeasonalConfig>(`/seasonal-config/${id}`),
  create: (data: CreateSeasonalConfigInput) =>
    request<SeasonalConfig>('/seasonal-config', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateSeasonalConfigInput) =>
    request<SeasonalConfig>(`/seasonal-config/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ deleted: true }>(`/seasonal-config/${id}`, { method: 'DELETE' }),
};

// Calendar Events
export const calendarEvents = {
  list: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<CalendarEvent[]>(`/calendar-events${query}`);
  },
  get: (id: string) => request<CalendarEvent>(`/calendar-events/${id}`),
  create: (data: CreateCalendarEventInput) =>
    request<CalendarEvent>('/calendar-events', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateCalendarEventInput) =>
    request<CalendarEvent>(`/calendar-events/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ deleted: true }>(`/calendar-events/${id}`, { method: 'DELETE' }),
};

// Weekly Theme Templates
export const weeklyThemeTemplates = {
  list: () => request<WeeklyThemeTemplate[]>('/weekly-theme-templates'),
  get: (id: string) => request<WeeklyThemeTemplate>(`/weekly-theme-templates/${id}`),
  create: (data: CreateWeeklyThemeTemplateInput) =>
    request<WeeklyThemeTemplate>('/weekly-theme-templates', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateWeeklyThemeTemplateInput) =>
    request<WeeklyThemeTemplate>(`/weekly-theme-templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ deleted: true }>(`/weekly-theme-templates/${id}`, { method: 'DELETE' }),
};

// Weekly Theme Blocks
export const weeklyThemeBlocks = {
  list: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<WeeklyThemeBlock[]>(`/weekly-theme-blocks${query}`);
  },
  get: (id: string) => request<WeeklyThemeBlock>(`/weekly-theme-blocks/${id}`),
  create: (data: CreateWeeklyThemeBlockInput) =>
    request<WeeklyThemeBlock>('/weekly-theme-blocks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateWeeklyThemeBlockInput) =>
    request<WeeklyThemeBlock>(`/weekly-theme-blocks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ deleted: true }>(`/weekly-theme-blocks/${id}`, { method: 'DELETE' }),
};

// Search
export interface SearchResult {
  id: string;
  type: 'task' | 'project' | 'inbox' | 'material';
  title: string;
  snippet: string;
  domain_id: string | null;
  project_id: string | null;
  status: string | null;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  elapsed_ms: number;
}

export const search = {
  query: (params: { q: string; type?: string; limit?: number }) => {
    const queryParams = new URLSearchParams({ q: params.q });
    if (params.type) queryParams.set('type', params.type);
    if (params.limit) queryParams.set('limit', params.limit.toString());
    return request<SearchResponse>(`/search?${queryParams.toString()}`);
  },
};

// Data Management (Features 147-149)
export const dataManagement = {
  getDbSize: () =>
    request<{ size_bytes: number; size_formatted: string }>('/data-management/db-size'),
  exportJson: async () => {
    const url = `${API_BASE}/data-management/export`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new ApiError('Export failed', response.status);
    }
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `groundwork-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  },
  purgePreview: () =>
    request<{ count: number; cutoff_date: string }>('/data-management/purge-preview'),
  purge: () =>
    request<{ total_purged: number; purged_by_table: Record<string, number> }>(
      '/data-management/purge',
      { method: 'POST' }
    ),
};

export { ApiError };
