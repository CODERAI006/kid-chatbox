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
const aiRoutes = require('./routes/ai');
const learningBotRoutes = require('./routes/learning-bot');
const quizSchedulerRoutes = require('./routes/quiz-scheduler');
const bulkExamUploadRoutes = require('./routes/bulk-exam-upload');
const { startScheduler } = require('./services/schedulerEngine');
const { initializeDatabase } = require('./config/database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS configuration - allow production domain
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5174',
];

// Add production domain from environment variable
if (process.env.VITE_FRONTEND_URL) {
  allowedOrigins.push(process.env.VITE_FRONTEND_URL);
}

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

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
app.use('/api/public', publicRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/learning-bot', learningBotRoutes);
app.use('/api/quiz-scheduler', quizSchedulerRoutes);
app.use('/api/bulk-exam-upload', bulkExamUploadRoutes);

// Serve static files from React app in production
if (NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  
  // Handle React routing - return all requests to React app
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ success: false, message: 'API endpoint not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
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
const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      // Start quiz scheduler after server is up
      startScheduler();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;

