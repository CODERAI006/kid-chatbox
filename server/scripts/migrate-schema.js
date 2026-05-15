/**
 * Comprehensive database schema migration
 * Creates all tables for admin portal, RBAC, topics, quizzes, and analytics
 */

const { pool } = require('../config/database');

const migrateSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Roles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        resource VARCHAR(100) NOT NULL,
        action VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Role permissions junction table
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      )
    `);

    // 3b. Core users table (auth + profile). Must exist before ALTER / FKs below.
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT,
        name VARCHAR(255) NOT NULL,
        age INTEGER,
        grade VARCHAR(100),
        preferred_language VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Enhance users table with approval workflow
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS avatar_url TEXT,
      ADD COLUMN IF NOT EXISTS parent_contact VARCHAR(255),
      ADD COLUMN IF NOT EXISTS age_group VARCHAR(50),
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
      ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20)
    `);

    // 5. User roles junction table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_by UUID REFERENCES users(id),
        PRIMARY KEY (user_id, role_id)
      )
    `);

    // 6. User module access table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_module_access (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        module_name VARCHAR(50) NOT NULL,
        has_access BOOLEAN DEFAULT true,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        granted_by UUID REFERENCES users(id),
        UNIQUE(user_id, module_name)
      )
    `);

    // 7. Topics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS topics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        age_group VARCHAR(50) NOT NULL,
        difficulty_level VARCHAR(50) NOT NULL,
        thumbnail_url TEXT,
        category VARCHAR(100),
        learning_outcomes JSONB,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // 8. Subtopics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subtopics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        difficulty_level VARCHAR(50) NOT NULL,
        illustration_url TEXT,
        video_url TEXT,
        voice_narration_url TEXT,
        ai_story TEXT,
        key_points JSONB,
        order_index INTEGER DEFAULT 0,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // 9. Study material table
    await client.query(`
      CREATE TABLE IF NOT EXISTS study_material (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subtopic_id UUID NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
        content_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content JSONB NOT NULL,
        order_index INTEGER DEFAULT 0,
        age_group VARCHAR(50),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_published BOOLEAN DEFAULT false
      )
    `);

    // 10. Quizzes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subtopic_id UUID REFERENCES subtopics(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        age_group VARCHAR(50) NOT NULL,
        difficulty VARCHAR(50) NOT NULL,
        number_of_questions INTEGER NOT NULL DEFAULT 15,
        passing_percentage DECIMAL(5,2) DEFAULT 60.00,
        time_limit INTEGER,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // Make subtopic_id nullable if table already exists
    await client.query(`
      ALTER TABLE quizzes
      ALTER COLUMN subtopic_id DROP NOT NULL
    `).catch(() => {});

    // Add extra quiz metadata columns (idempotent)
    await client.query(`
      ALTER TABLE quizzes
      ADD COLUMN IF NOT EXISTS grade_level VARCHAR(100),
      ADD COLUMN IF NOT EXISTS subject VARCHAR(100),
      ADD COLUMN IF NOT EXISTS in_library BOOLEAN DEFAULT false
    `).catch(() => {});

    // 11. Quiz questions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        question_type VARCHAR(50) NOT NULL,
        question_text TEXT NOT NULL,
        question_image_url TEXT,
        options JSONB,
        correct_answer JSONB NOT NULL,
        explanation TEXT,
        hint TEXT,
        points INTEGER DEFAULT 1,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 12. Quiz attempts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        time_taken INTEGER,
        score INTEGER NOT NULL DEFAULT 0,
        total_questions INTEGER NOT NULL,
        correct_answers INTEGER NOT NULL DEFAULT 0,
        wrong_answers INTEGER NOT NULL DEFAULT 0,
        score_percentage DECIMAL(5,2),
        tokens_earned INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'in_progress'
      )
    `);

    // 13. Quiz attempt answers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
        question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
        user_answer JSONB,
        is_correct BOOLEAN NOT NULL,
        time_spent INTEGER,
        answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 13b. AI / tutor quiz results (used by server/routes/quiz.js, analytics.js — not quiz_attempts)
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        subject VARCHAR(255) NOT NULL,
        subtopic TEXT NOT NULL,
        age INTEGER NOT NULL,
        language VARCHAR(50) NOT NULL,
        correct_count INTEGER NOT NULL DEFAULT 0,
        wrong_count INTEGER NOT NULL DEFAULT 0,
        explanation_of_mistakes TEXT,
        time_taken INTEGER NOT NULL DEFAULT 0,
        score_percentage DECIMAL(5,2) NOT NULL
      )
    `);

    // 13c. Per-question rows for AI quiz results
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_answers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quiz_result_id UUID NOT NULL REFERENCES quiz_results(id) ON DELETE CASCADE,
        question_number INTEGER NOT NULL,
        question TEXT NOT NULL,
        child_answer TEXT,
        correct_answer TEXT NOT NULL,
        explanation TEXT,
        is_correct BOOLEAN NOT NULL,
        options JSONB
      )
    `);

    // 13d. Learning bot (floating chat) — persisted threads per user
    await client.query(`
      CREATE TABLE IF NOT EXISTS learning_bot_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        archived BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS learning_bot_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES learning_bot_conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT learning_bot_messages_role_chk CHECK (role IN ('user', 'assistant'))
      )
    `);

    // 13e. Word of the Day — full API payload cache (skips Dictionary + Ollama on repeat hits)
    await client.query(`
      CREATE TABLE IF NOT EXISTS word_of_the_day_cache (
        word_key VARCHAR(120) NOT NULL,
        cache_date DATE NOT NULL,
        payload JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (word_key, cache_date)
      )
    `);

    // 14. Study sessions table (for AI-generated study sessions)
    await client.query(`
      CREATE TABLE IF NOT EXISTS study_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(100) NOT NULL,
        topic VARCHAR(255) NOT NULL,
        age INTEGER NOT NULL,
        language VARCHAR(50) NOT NULL,
        difficulty VARCHAR(50) NOT NULL,
        lesson_title VARCHAR(255) NOT NULL,
        lesson_introduction TEXT,
        lesson_explanation JSONB,
        lesson_key_points JSONB,
        lesson_examples JSONB,
        lesson_summary TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 15. Study progress table
    await client.query(`
      CREATE TABLE IF NOT EXISTS study_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subtopic_id UUID NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
        material_id UUID REFERENCES study_material(id) ON DELETE SET NULL,
        progress_percentage DECIMAL(5,2) DEFAULT 0,
        time_spent INTEGER DEFAULT 0,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        is_completed BOOLEAN DEFAULT false,
        UNIQUE(user_id, subtopic_id)
      )
    `);

    // 16. Activity logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id UUID,
        metadata JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 17. Tokens usage table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tokens_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tokens_earned INTEGER DEFAULT 0,
        tokens_spent INTEGER DEFAULT 0,
        source VARCHAR(100),
        reference_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
      CREATE INDEX IF NOT EXISTS idx_topics_age_group ON topics(age_group);
      CREATE INDEX IF NOT EXISTS idx_topics_category ON topics(category);
      CREATE INDEX IF NOT EXISTS idx_subtopics_topic_id ON subtopics(topic_id);
      CREATE INDEX IF NOT EXISTS idx_study_material_subtopic_id ON study_material(subtopic_id);
      CREATE INDEX IF NOT EXISTS idx_quizzes_subtopic_id ON quizzes(subtopic_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_results_timestamp ON quiz_results(timestamp);
      CREATE INDEX IF NOT EXISTS idx_quiz_results_subject_subtopic ON quiz_results(subject, subtopic);
      CREATE INDEX IF NOT EXISTS idx_quiz_answers_quiz_result_id ON quiz_answers(quiz_result_id);
      CREATE INDEX IF NOT EXISTS idx_learning_bot_conv_user_active ON learning_bot_conversations(user_id) WHERE archived = false;
      CREATE INDEX IF NOT EXISTS idx_learning_bot_conv_updated ON learning_bot_conversations(user_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_learning_bot_msg_conv_created ON learning_bot_messages(conversation_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_word_of_the_day_cache_date ON word_of_the_day_cache(cache_date);
      CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_study_sessions_subject ON study_sessions(subject);
      CREATE INDEX IF NOT EXISTS idx_study_sessions_topic ON study_sessions(topic);
      CREATE INDEX IF NOT EXISTS idx_study_sessions_timestamp ON study_sessions(timestamp);
      CREATE INDEX IF NOT EXISTS idx_study_progress_user_id ON study_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_study_progress_subtopic_id ON study_progress(subtopic_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_tokens_usage_user_id ON tokens_usage(user_id);
    `);

    // Insert default roles
    await client.query(`
      INSERT INTO roles (name, description) 
      VALUES 
        ('admin', 'Full platform control'),
        ('content_manager', 'Can manage topics, content, and quizzes'),
        ('student', 'Standard user'),
        ('parent', 'Can view child progress')
      ON CONFLICT (name) DO NOTHING
    `);

    // Insert default permissions
    await client.query(`
      INSERT INTO permissions (name, description, resource, action) 
      VALUES 
        ('manage_users', 'Manage all users', 'users', 'manage'),
        ('approve_users', 'Approve or reject user registrations', 'users', 'approve'),
        ('manage_topics', 'Create, edit, delete topics', 'topics', 'manage'),
        ('manage_subtopics', 'Create, edit, delete subtopics', 'subtopics', 'manage'),
        ('manage_study_material', 'Create, edit, delete study materials', 'study_material', 'manage'),
        ('manage_quizzes', 'Create, edit, delete quizzes', 'quizzes', 'manage'),
        ('view_analytics', 'View platform analytics', 'analytics', 'view'),
        ('assign_roles', 'Assign roles to users', 'users', 'assign_roles'),
        ('export_reports', 'Export reports to PDF/Excel', 'reports', 'export')
      ON CONFLICT (name) DO NOTHING
    `);

    // Assign permissions to admin role
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.name = 'admin'
      ON CONFLICT DO NOTHING
    `);

    // Assign permissions to content_manager role
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE p.name IN ('manage_topics', 'manage_subtopics', 'manage_study_material', 'manage_quizzes', 'view_analytics')
      AND r.name = 'content_manager'
      ON CONFLICT DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('✅ Database schema migrated successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error migrating database schema:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migration if called directly
if (require.main === module) {
  migrateSchema()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateSchema };

