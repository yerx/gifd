import express from 'express';
import cors from 'cors';
import path from 'path';
import { getDb, closeDb } from './db/schema';

// Route imports
import domainsRouter from './routes/domains';
import projectsRouter from './routes/projects';
import tasksRouter from './routes/tasks';
import inboxRouter from './routes/inbox';
import dailyPlansRouter from './routes/daily-plans';
import timeBlocksRouter from './routes/time-blocks';
import taskEventsRouter from './routes/task-events';
import tagsRouter from './routes/tags';
import materialsRouter from './routes/materials';
import seasonalConfigRouter from './routes/seasonal-config';
import calendarEventsRouter from './routes/calendar-events';
import weeklyThemeTemplatesRouter from './routes/weekly-theme-templates';
import weeklyThemeBlocksRouter from './routes/weekly-theme-blocks';
import attachmentsRouter from './routes/attachments';
import taskTagsRouter from './routes/task-tags';
import searchRouter from './routes/search';
import dataManagementRouter from './routes/data-management';

const app = express();
const PORT = parseInt(process.env.GROUNDWORK_PORT || '3001', 10);
const isDesktop = process.env.GROUNDWORK_DESKTOP === 'true';

// Middleware
if (isDesktop) {
  app.use(cors());
} else {
  app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
  }));
}
app.use(express.json());

// Initialize database on startup
getDb();
console.log('Database initialized');

// API Routes
app.use('/api/domains', domainsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/inbox', inboxRouter);
app.use('/api/daily-plans', dailyPlansRouter);
app.use('/api/time-blocks', timeBlocksRouter);
app.use('/api/task-events', taskEventsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/seasonal-config', seasonalConfigRouter);
app.use('/api/calendar-events', calendarEventsRouter);
app.use('/api/weekly-theme-templates', weeklyThemeTemplatesRouter);
app.use('/api/weekly-theme-blocks', weeklyThemeBlocksRouter);
app.use('/api/attachments', attachmentsRouter);
app.use('/api/task-tags', taskTagsRouter);
app.use('/api/search', searchRouter);
app.use('/api/data-management', dataManagementRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Desktop mode: serve static Next.js export and SPA fallback
if (isDesktop) {
  const staticDir = process.env.GROUNDWORK_STATIC_DIR || path.join(__dirname, '..', 'web-static');
  app.use(express.static(staticDir));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(staticDir, 'index.html'));
    }
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`GroundWork API server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});
