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
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
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
const adminNewsRoutes = require('./routes/admin-news');
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
const puzzlesRoutes = require('./routes/puzzles');
const adminPuzzlesRoutes = require('./routes/admin-puzzles');
const feedbackRoutes = require('./routes/feedback');
const adminFeedbackRoutes = require('./routes/admin-feedback');
const adminSitePagesRoutes = require('./routes/admin-site-pages');
const studyBuddiesRoutes = require('./routes/study-buddies');
const notificationsRoutes = require('./routes/notifications');
const imagesRoutes = require('./routes/images');
const paymentRequestsRoutes = require('./routes/payment-requests');
const adminPaymentSettingsRoutes = require('./routes/admin-payment-settings');
const adminPaymentRequestsRoutes = require('./routes/admin-payment-requests');
const protectedUploads = require('./middleware/protectedUploads');
const { startScheduler } = require('./services/schedulerEngine');
const { initializeDatabase } = require('./config/database');

dotenv.config();

const { resolveNodeEnv } = require('./utils/resolveNodeEnv');
const NODE_ENV = resolveNodeEnv();
process.env.NODE_ENV = NODE_ENV;

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — API routes only (global CORS breaks crossorigin modulepreload /assets/*.js with 500)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

/** Allow Vite when opened via 127.0.0.1 while NODE_ENV=production (common on Windows). */
function isLoopbackOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

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
    if (!origin || NODE_ENV === 'development') {
      return callback(null, true);
    }
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
app.use(cookieParser());
if (NODE_ENV === 'production') {
  app.use(helmet({ contentSecurityPolicy: false }));
}

app.use('/api', cors(corsOptions));

const defaultJsonParser = express.json({ limit: '2mb' });
const largeJsonParser = express.json({ limit: '15mb' });
const defaultUrlParser = express.urlencoded({ extended: true, limit: '2mb' });

app.use((req, res, next) => {
  const needsLargeBody =
    req.path.startsWith('/api/ai') || req.path.startsWith('/api/learning-bot');
  if (needsLargeBody) {
    return largeJsonParser(req, res, (err) => {
      if (err) return next(err);
      express.urlencoded({ extended: true, limit: '15mb' })(req, res, next);
    });
  }
  return defaultJsonParser(req, res, (err) => {
    if (err) return next(err);
    defaultUrlParser(req, res, next);
  });
});

// All user uploads require authentication (study library + quiz images)
app.use('/uploads/study-library', protectedUploads.studyLibrary);
app.use('/uploads/quiz-images', protectedUploads.quizImages);
app.use('/uploads/payment-proofs', protectedUploads.paymentProofs);
app.use('/uploads/payment-public', express.static(path.join(__dirname, '../uploads/payment-public')));

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
app.use('/api/admin/news', adminNewsRoutes);
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
app.use('/api/public/puzzles', puzzlesRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/learning-bot', learningBotRoutes);
app.use('/api/study-plan', studyPlanRoutes);
app.use('/api/competitive-topics', competitiveTopicsRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin/feedback', adminFeedbackRoutes);
app.use('/api/admin/site-pages', adminSitePagesRoutes);
app.use('/api/admin/puzzles', adminPuzzlesRoutes);
app.use('/api/study-buddies', studyBuddiesRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/quiz-scheduler', quizSchedulerRoutes);
app.use('/api/bulk-exam-upload', bulkExamUploadRoutes);
app.use('/api/payment-requests', paymentRequestsRoutes);
app.use('/api/admin/payment-settings', adminPaymentSettingsRoutes);
app.use('/api/admin/payment-requests', adminPaymentRequestsRoutes);

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

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File too large. Maximum upload size is 50MB.',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'Invalid upload',
    });
  }

  const status = err.status || 500;
  const message =
    status >= 500 && NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(status).json({
    success: false,
    message,
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

  const server = http.createServer(app);

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Stop the other process first:`);
      console.error(`   pm2 stop kidchatbox-api   OR   lsof -i :${PORT} / fuser -k ${PORT}/tcp`);
      process.exit(1);
    }
    console.error('❌ Server failed to start:', error.message || error);
    process.exit(1);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received — closing HTTP server on port ${PORT}`);
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  server.listen(PORT, '0.0.0.0', () => {
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

