import { test, expect } from '@playwright/test';

test.describe('Tasks API', () => {
  test.describe.configure({ mode: 'serial' });

  let domainId: string;
  let projectId: string;

  test.beforeAll(async ({ request }) => {
    // Create a domain and project to hold tasks
    const domainRes = await request.post('/api/domains', {
      data: { name: 'Tasks Test Domain', color: '#aabb00' },
    });
    const domain = await domainRes.json();
    domainId = domain.id;

    const projectRes = await request.post('/api/projects', {
      data: { domain_id: domainId, name: 'Tasks Test Project' },
    });
    const project = await projectRes.json();
    projectId = project.id;
  });

  test.afterAll(async ({ request }) => {
    // Clean up domain (cascades to projects and tasks)
    await request.delete(`/api/domains/${domainId}`);
  });

  test.describe('Basic CRUD', () => {
    test.describe.configure({ mode: 'serial' });

    let taskId: string;

    test('POST /api/tasks - create a task', async ({ request }) => {
      const response = await request.post('/api/tasks', {
        data: {
          project_id: projectId,
          title: 'Test Task',
          status: 'backlog',
          notes: 'Some notes',
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.id).toBeTruthy();
      expect(body.project_id).toBe(projectId);
      expect(body.title).toBe('Test Task');
      expect(body.status).toBe('backlog');
      expect(body.notes).toBe('Some notes');
      expect(body.deleted_at).toBeNull();
      expect(body.completed_at).toBeNull();

      taskId = body.id;
    });

    test('GET /api/tasks/:id - read task', async ({ request }) => {
      const response = await request.get(`/api/tasks/${taskId}`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.id).toBe(taskId);
      expect(body.title).toBe('Test Task');
    });

    test('PATCH /api/tasks/:id - update status to active', async ({ request }) => {
      const response = await request.patch(`/api/tasks/${taskId}`, {
        data: { status: 'active' },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('active');
    });

    test('PATCH /api/tasks/:id - set due_date', async ({ request }) => {
      const response = await request.patch(`/api/tasks/${taskId}`, {
        data: { due_date: '2026-03-15' },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.due_date).toBe('2026-03-15');
    });

    test('PATCH /api/tasks/:id - set estimated_minutes', async ({ request }) => {
      const response = await request.patch(`/api/tasks/${taskId}`, {
        data: { estimated_minutes: 45 },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.estimated_minutes).toBe(45);
    });

    test('GET /api/tasks?project_id= - list tasks by project', async ({ request }) => {
      const response = await request.get(`/api/tasks?project_id=${projectId}`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);

      const found = body.find((t: { id: string }) => t.id === taskId);
      expect(found).toBeTruthy();
    });

    test('DELETE /api/tasks/:id - soft delete', async ({ request }) => {
      const response = await request.delete(`/api/tasks/${taskId}`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.deleted).toBe(true);

      // Verify it is gone from GET
      const getResponse = await request.get(`/api/tasks/${taskId}`);
      expect(getResponse.status()).toBe(404);
    });
  });

  test.describe('Recurring task clone-on-complete', () => {
    test('Create recurring task and mark done - new task is cloned', async ({ request }) => {
      // Create a task with recurrence_rule and a due_date
      const createRes = await request.post('/api/tasks', {
        data: {
          project_id: projectId,
          title: 'Daily Standup',
          due_date: '2026-03-01',
          recurrence_rule: 'FREQ=DAILY',
        },
      });

      expect(createRes.status()).toBe(201);
      const created = await createRes.json();
      const recurringTaskId = created.id;
      expect(created.recurrence_rule).toBe('FREQ=DAILY');

      // Mark the task as done
      const doneRes = await request.patch(`/api/tasks/${recurringTaskId}`, {
        data: { status: 'done' },
      });

      expect(doneRes.status()).toBe(200);
      const doneBody = await doneRes.json();
      expect(doneBody.status).toBe('done');
      expect(doneBody.completed_at).toBeTruthy();

      // Verify the _next_recurring_task was created
      expect(doneBody._next_recurring_task).toBeTruthy();
      const nextTask = doneBody._next_recurring_task;
      expect(nextTask.title).toBe('Daily Standup');
      expect(nextTask.status).toBe('backlog');
      expect(nextTask.due_date).toBe('2026-03-02');
      expect(nextTask.recurrence_rule).toBe('FREQ=DAILY');
      expect(nextTask.recurrence_parent_id).toBe(recurringTaskId);

      // Clean up both tasks
      await request.delete(`/api/tasks/${recurringTaskId}`);
      await request.delete(`/api/tasks/${nextTask.id}`);
    });
  });

  test.describe('Task event logging', () => {
    test('Status change creates a task event', async ({ request }) => {
      // Create a task
      const createRes = await request.post('/api/tasks', {
        data: {
          project_id: projectId,
          title: 'Event Test Task',
        },
      });
      const task = await createRes.json();

      // Change status from backlog to active
      await request.patch(`/api/tasks/${task.id}`, {
        data: { status: 'active' },
      });

      // Fetch events for this task
      const eventsRes = await request.get(`/api/task-events?task_id=${task.id}`);
      expect(eventsRes.status()).toBe(200);

      const events = await eventsRes.json();
      expect(Array.isArray(events)).toBe(true);

      // Should have at least a 'created' event and a 'status_changed' event
      const createdEvent = events.find((e: { event_type: string }) => e.event_type === 'created');
      expect(createdEvent).toBeTruthy();

      const statusEvent = events.find((e: { event_type: string }) => e.event_type === 'status_changed');
      expect(statusEvent).toBeTruthy();
      expect(statusEvent.old_value).toContain('backlog');
      expect(statusEvent.new_value).toContain('active');

      // Clean up
      await request.delete(`/api/tasks/${task.id}`);
    });

    test('Completing a task creates a completed event', async ({ request }) => {
      const createRes = await request.post('/api/tasks', {
        data: {
          project_id: projectId,
          title: 'Completion Event Task',
        },
      });
      const task = await createRes.json();

      // Mark as done
      await request.patch(`/api/tasks/${task.id}`, {
        data: { status: 'done' },
      });

      const eventsRes = await request.get(`/api/task-events?task_id=${task.id}`);
      const events = await eventsRes.json();

      const completedEvent = events.find((e: { event_type: string }) => e.event_type === 'completed');
      expect(completedEvent).toBeTruthy();
      expect(completedEvent.new_value).toContain('done');

      // Clean up
      await request.delete(`/api/tasks/${task.id}`);
    });

    test('Changing due_date creates a rescheduled event', async ({ request }) => {
      const createRes = await request.post('/api/tasks', {
        data: {
          project_id: projectId,
          title: 'Reschedule Event Task',
          due_date: '2026-04-01',
        },
      });
      const task = await createRes.json();

      // Change due_date
      await request.patch(`/api/tasks/${task.id}`, {
        data: { due_date: '2026-04-15' },
      });

      const eventsRes = await request.get(`/api/task-events?task_id=${task.id}`);
      const events = await eventsRes.json();

      const reschedEvent = events.find((e: { event_type: string }) => e.event_type === 'rescheduled');
      expect(reschedEvent).toBeTruthy();
      expect(reschedEvent.new_value).toContain('2026-04-15');

      // Clean up
      await request.delete(`/api/tasks/${task.id}`);
    });

    test('Changing estimated_minutes creates an estimate_changed event', async ({ request }) => {
      const createRes = await request.post('/api/tasks', {
        data: {
          project_id: projectId,
          title: 'Estimate Event Task',
          estimated_minutes: 30,
        },
      });
      const task = await createRes.json();

      // Change estimate
      await request.patch(`/api/tasks/${task.id}`, {
        data: { estimated_minutes: 60 },
      });

      const eventsRes = await request.get(`/api/task-events?task_id=${task.id}`);
      const events = await eventsRes.json();

      const estimateEvent = events.find((e: { event_type: string }) => e.event_type === 'estimate_changed');
      expect(estimateEvent).toBeTruthy();
      expect(estimateEvent.old_value).toContain('30');
      expect(estimateEvent.new_value).toContain('60');

      // Clean up
      await request.delete(`/api/tasks/${task.id}`);
    });
  });

  test.describe('Validation', () => {
    test('POST /api/tasks - missing required fields returns 400', async ({ request }) => {
      const response = await request.post('/api/tasks', {
        data: { title: 'No project' },
      });
      expect(response.status()).toBe(400);
    });

    test('GET /api/tasks/:id - non-existent returns 404', async ({ request }) => {
      const response = await request.get('/api/tasks/nonexistent-id');
      expect(response.status()).toBe(404);
    });
  });
});
