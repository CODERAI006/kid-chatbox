/**
 * Express server for KidChatbox API
 */

// Suppress deprecation warnings from dependencies
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  // Only suppress util._extend deprecation warnings
  if (warning.name === 'DeprecationWarning' && warning.message.includes('util._extend')) {
    return; // Suppress this specific warning
  }
  // Show other warnings
  console.warn(warning.name, warning.message);
});

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const quizzesRoutes = require('./routes/quizzes');
const studyRoutes = require('./routes/study');
const analyticsRoutes = require('./routes/analytics');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');
const adminAnalyticsRoutes = require('./routes/admin-analytics');
const topicsRoutes = require('./routes/topics');
const studyMaterialRoutes = require('./routes/study-material');
const studyLibraryRoutes = require('./routes/study-library');
const studyLibraryContentRoutes = require('./routes/study-library-content');
const plansRoutes = require('./routes/plans');
const scheduledTestsRoutes = require('./routes/scheduled-tests');
const quizLibraryRoutes = require('./routes/quiz-library');
const publicRoutes = require('./routes/public');
const wordsOfDayRoutes = require('./routes/words-of-day');
const factsAndFunRoutes = require('./routes/facts-and-fun');
const aiRoutes = require('./routes/ai');
const learningBotRoutes = require('./routes/learning-bot');
const studyPlanRoutes = require('./routes/study-plan');
const competitiveTopicsRoutes = require('./routes/competitive-topics');
const ttsRoutes = require('./routes/tts');
const quizSchedulerRoutes = require('./routes/quiz-scheduler');
const bulkExamUploadRoutes = require('./routes/bulk-exam-upload');
const feedbackRoutes = require('./routes/feedback');
const adminFeedbackRoutes = require('./routes/admin-feedback');
const studyBuddiesRoutes = require('./routes/study-buddies');
const notificationsRoutes = require('./routes/notifications');
const { startScheduler } = require('./services/schedulerEngine');
const { initializeDatabase } = require('./config/database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS — API routes only (global CORS breaks crossorigin modulepreload /assets/*.js with 500)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5174',
];

function addOriginVariants(url) {
  try {
    const parsed = new URL(url);
    const port = parsed.port ? `:${parsed.port}` : '';
    allowedOrigins.push(`${parsed.protocol}//${parsed.hostname}${port}`);
    const bare = parsed.hostname.replace(/^www\./, '');
    const withWww = parsed.hostname.startsWith('www.') ? parsed.hostname : `www.${parsed.hostname}`;
    allowedOrigins.push(`${parsed.protocol}//${bare}${port}`);
    allowedOrigins.push(`${parsed.protocol}//${withWww}${port}`);
  } catch {
    allowedOrigins.push(url);
  }
}

if (process.env.VITE_FRONTEND_URL) {
  addOriginVariants(process.env.VITE_FRONTEND_URL);
}
if (process.env.CORS_ORIGINS) {
  process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean).forEach(addOriginVariants);
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || NODE_ENV === 'development') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    try {
      const originHost = new URL(origin).hostname.replace(/^www\./, '');
      const matched = allowedOrigins.some((allowed) => {
        const allowedHost = new URL(allowed).hostname.replace(/^www\./, '');
        return allowedHost === originHost;
      });
      if (matched) return callback(null, true);
    } catch {
      /* ignore malformed Origin */
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use('/api', cors(corsOptions));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'KidChatbox API is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'KidChatbox API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes); // Legacy quiz routes
app.use('/api/quizzes', quizzesRoutes); // New quiz management routes
app.use('/api/study', studyRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/study-material', studyMaterialRoutes);
app.use('/api/study-library', studyLibraryRoutes);
app.use('/api/admin/study-library-content', studyLibraryContentRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/scheduled-tests', scheduledTestsRoutes);
app.use('/api/quiz-library', quizLibraryRoutes);
app.use('/api/public/words-of-day', wordsOfDayRoutes);
app.use('/api/public/facts-and-fun', factsAndFunRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/learning-bot', learningBotRoutes);
app.use('/api/study-plan', studyPlanRoutes);
app.use('/api/competitive-topics', competitiveTopicsRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin/feedback', adminFeedbackRoutes);
app.use('/api/study-buddies', studyBuddiesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/quiz-scheduler', quizSchedulerRoutes);
app.use('/api/bulk-exam-upload', bulkExamUploadRoutes);

// Serve static files from React app in production
if (NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../dist');
  const indexHtml = path.join(distPath, 'index.html');

  if (!fs.existsSync(indexHtml)) {
    console.warn('⚠️  Production build missing. Run: npm run build');
  }

  app.use(
    express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    })
  );

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ success: false, message: 'API endpoint not found' });
    }
    if (/\.[a-z0-9]+$/i.test(req.path)) {
      return res.status(404).type('text/plain').send('Not found');
    }
    res.sendFile(indexHtml, (err) => {
      if (err) next(err);
    });
  });
}

// 404 handler — catches unmatched API routes in all environments and returns JSON
// (prevents Express default HTML "Cannot GET /api/..." from breaking frontend JSON.parse)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: `API endpoint not found: ${req.method} ${req.path}` });
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// Initialize database and start server
const { loadOllamaCloudSettings } = require('./utils/ollamaCloudSettings');
const { loadGoogleAnalyticsSettings } = require('./utils/googleAnalyticsSettings');

const startServer = async () => {
  const dbReady = await initializeDatabase();
  if (!dbReady) {
    console.warn('⚠️  Database unavailable — API routes needing Postgres may fail until DB is reachable.');
  }

  try {
    await loadOllamaCloudSettings();
  } catch (error) {
    console.warn('⚠️  Ollama settings load failed (non-fatal):', error.message || error);
  }

  try {
    await loadGoogleAnalyticsSettings();
  } catch (error) {
    console.warn('⚠️  Google Analytics settings load failed (non-fatal):', error.message || error);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`🌍 Environment: ${NODE_ENV}`);
    if (dbReady) {
      startScheduler();
    } else {
      console.warn('⚠️  Quiz scheduler skipped until database is initialized.');
    }
  });
};

startServer();

module.exports = app;

