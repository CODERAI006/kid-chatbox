/**
 * Study Library API routes
 * Handles fetching shared study materials that students can browse
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkModuleAccess } = require('../middleware/rbac');
const { isAdminUser, buildStudentVisibilityClause } = require('../utils/studyContentVisibility');

const router = express.Router();

function parseJsonField(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

function mapStudySessionRow(row) {
  return {
    ...row,
    lesson_explanation: parseJsonField(row.lesson_explanation) || [],
    lesson_key_points: parseJsonField(row.lesson_key_points) || [],
    lesson_examples: parseJsonField(row.lesson_examples) || [],
    lesson_content: parseJsonField(row.lesson_content),
  };
}

// All routes require authentication and study module access
router.use(authenticateToken);
router.use(checkModuleAccess('study'));

/**
 * Get shared study sessions (study library)
 * GET /api/study-library?search=keyword&subject=math&age=10&difficulty=easy&limit=20&offset=0
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      search,
      subject,
      age,
      difficulty,
      language,
      limit = 20,
      offset = 0,
      sortBy = 'timestamp', // timestamp, popularity
    } = req.query;

    let query = `
      SELECT 
        ss.id,
        ss.timestamp,
        ss.subject,
        ss.topic,
        ss.age,
        ss.language,
        ss.difficulty,
        ss.lesson_title,
        ss.lesson_introduction,
        ss.lesson_summary,
        u.name as created_by_name,
        u.id as created_by_id,
        COUNT(DISTINCT al.user_id) FILTER (WHERE al.action = 'view_study_session' AND al.resource_id = ss.id) as view_count
      FROM study_sessions ss
      INNER JOIN users u ON ss.user_id = u.id
      LEFT JOIN activity_logs al ON al.resource_type = 'study_session' AND al.resource_id = ss.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    // Search filter
    if (search) {
      paramCount++;
      query += ` AND (
        ss.topic ILIKE $${paramCount} OR 
        ss.lesson_title ILIKE $${paramCount} OR
        ss.subject ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    // Subject filter
    if (subject) {
      paramCount++;
      query += ` AND ss.subject = $${paramCount}`;
      params.push(subject);
    }

    // Age filter
    if (age) {
      paramCount++;
      query += ` AND ss.age = $${paramCount}`;
      params.push(parseInt(age));
    }

    // Difficulty filter
    if (difficulty) {
      paramCount++;
      query += ` AND ss.difficulty = $${paramCount}`;
      params.push(difficulty);
    }

    // Language filter
    if (language) {
      paramCount++;
      query += ` AND ss.language = $${paramCount}`;
      params.push(language);
    }

    query += ` GROUP BY ss.id, u.name, u.id`;

    // Sorting
    if (sortBy === 'popularity') {
      query += ` ORDER BY view_count DESC, ss.timestamp DESC`;
    } else {
      query += ` ORDER BY ss.timestamp DESC`;
    }

    // Pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT ss.id) as total
      FROM study_sessions ss
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (
        ss.topic ILIKE $${countParamCount} OR 
        ss.lesson_title ILIKE $${countParamCount} OR
        ss.subject ILIKE $${countParamCount}
      )`;
      countParams.push(`%${search}%`);
    }

    if (subject) {
      countParamCount++;
      countQuery += ` AND ss.subject = $${countParamCount}`;
      countParams.push(subject);
    }

    if (age) {
      countParamCount++;
      countQuery += ` AND ss.age = $${countParamCount}`;
      countParams.push(parseInt(age));
    }

    if (difficulty) {
      countParamCount++;
      countQuery += ` AND ss.difficulty = $${countParamCount}`;
      countParams.push(difficulty);
    }

    if (language) {
      countParamCount++;
      countQuery += ` AND ss.language = $${countParamCount}`;
      countParams.push(language);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    const skipVisibility = isAdminUser(req.user);
    const userGrade = req.user?.grade || null;
    const visibility = buildStudentVisibilityClause(
      { userGrade, skipFilter: skipVisibility },
      0
    );

    // Also fetch published admin-created study library content
    let contentQuery = `
      SELECT 
        slc.id,
        slc.title,
        slc.description,
        slc.content_type as "contentType",
        slc.file_url as "fileUrl",
        slc.file_name as "fileName",
        slc.file_size as "fileSize",
        slc.text_content as "textContent",
        slc.subject,
        slc.grade,
        slc.is_general as "isGeneral",
        slc.age_group as "ageGroup",
        slc.difficulty,
        slc.language,
        slc.publish_date as "publishDate",
        slc.view_count as "viewCount",
        slc.created_at as "createdAt",
        u.name as created_by_name,
        'admin_content' as content_source
      FROM study_library_content slc
      LEFT JOIN users u ON slc.created_by = u.id
      WHERE slc.is_published = true
        AND (slc.publish_date IS NULL OR slc.publish_date <= CURRENT_TIMESTAMP)
    `;
    const contentParams = [...visibility.params];
    let contentParamCount = visibility.nextIndex;

    contentQuery += visibility.clause;

    if (subject) {
      contentParamCount++;
      contentQuery += ` AND (slc.subject IS NULL OR slc.subject ILIKE $${contentParamCount})`;
      contentParams.push(`%${subject}%`);
    }

    if (age) {
      contentParamCount++;
      contentQuery += ` AND slc.age_group LIKE $${contentParamCount}`;
      contentParams.push(`%${age}%`);
    }

    if (difficulty) {
      contentParamCount++;
      contentQuery += ` AND LOWER(slc.difficulty) = LOWER($${contentParamCount})`;
      contentParams.push(difficulty);
    }

    if (language) {
      contentParamCount++;
      contentQuery += ` AND slc.language = $${contentParamCount}`;
      contentParams.push(language);
    }

    if (search) {
      contentParamCount++;
      contentQuery += ` AND (
        slc.title ILIKE $${contentParamCount} OR 
        slc.description ILIKE $${contentParamCount} OR
        slc.subject ILIKE $${contentParamCount}
      )`;
      contentParams.push(`%${search}%`);
    }

    contentQuery += ` ORDER BY slc.created_at DESC LIMIT $${++contentParamCount} OFFSET $${++contentParamCount}`;
    contentParams.push(parseInt(limit), parseInt(offset));

    const contentResult = await pool.query(contentQuery, contentParams);

    // Parse JSON fields
    const sessions = result.rows.map((row) => ({
      ...row,
      lesson_explanation:
        typeof row.lesson_explanation === 'string'
          ? JSON.parse(row.lesson_explanation)
          : row.lesson_explanation,
      lesson_key_points:
        typeof row.lesson_key_points === 'string'
          ? JSON.parse(row.lesson_key_points)
          : row.lesson_key_points,
      lesson_examples:
        typeof row.lesson_examples === 'string'
          ? JSON.parse(row.lesson_examples)
          : row.lesson_examples,
    }));

    // Combine study sessions and admin content
    const adminContent = contentResult.rows.map((row) => ({
      id: `admin_${row.id}`,
      title: row.title,
      lesson_title: row.title,
      topic: row.subject || (row.isGeneral ? 'General' : 'Study Material'),
      subject: row.subject || '',
      grade: row.grade || null,
      is_general: row.isGeneral || false,
      age: row.ageGroup ? parseInt(row.ageGroup.split('-')[0]) : null,
      difficulty: row.difficulty || '',
      language: row.language || 'English',
      lesson_summary: row.description || '',
      created_by_name: row.created_by_name || 'Admin',
      view_count: row.viewCount || 0,
      timestamp: row.createdAt || row.publishDate,
      content_source: 'admin_content',
      contentType: row.contentType,
      fileUrl: row.fileUrl,
      fileName: row.fileName,
      fileSize: row.fileSize,
      textContent: row.textContent,
    }));

    // Merge and sort by timestamp
    const allContent = [...sessions, ...adminContent].sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA; // Newest first
    });

    res.json({
      success: true,
      sessions: allContent,
      pagination: {
        total: total + contentResult.rows.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil((total + contentResult.rows.length) / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get popular study sessions
 * GET /api/study-library/popular?limit=10
 * NOTE: This must come BEFORE /:id route to avoid matching "popular" as an ID
 */
router.get('/popular', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(
      `SELECT 
        ss.id,
        ss.topic,
        ss.lesson_title,
        ss.subject,
        ss.difficulty,
        ss.age,
        COUNT(DISTINCT al.user_id) FILTER (WHERE al.action = 'view_study_session') as view_count
      FROM study_sessions ss
      LEFT JOIN activity_logs al ON al.resource_type = 'study_session' AND al.resource_id = ss.id
      GROUP BY ss.id
      ORDER BY view_count DESC
      LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({
      success: true,
      sessions: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get study session by ID
 * GET /api/study-library/:id
 * Handles both regular study sessions and admin-created content (IDs starting with "admin_")
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if this is an admin content ID
    if (id.startsWith('admin_')) {
      // Extract the actual ID (remove "admin_" prefix)
      const actualId = id.replace(/^admin_/, '');

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(actualId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid content ID format',
        });
      }

      let result;
      try {
        result = await pool.query(
          `SELECT 
            slc.*,
            u.name as created_by_name,
            u.id as created_by_id
          FROM study_library_content slc
          LEFT JOIN users u ON slc.created_by = u.id
          WHERE slc.id = $1
            AND slc.is_published = true
            AND (slc.publish_date IS NULL OR slc.publish_date <= CURRENT_TIMESTAMP)`,
          [actualId]
        );
      } catch (queryError) {
        console.error('Database query error:', queryError);
        throw queryError;
      }

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Study content not found or not published',
        });
      }

      const content = result.rows[0];
      const skipVisibility = isAdminUser(req.user);
      const userGrade = req.user?.grade || null;

      if (!skipVisibility) {
        const allowed =
          content.is_general ||
          !content.grade ||
          (userGrade && content.grade === userGrade) ||
          (!userGrade && !content.grade);

        if (!allowed) {
          return res.status(403).json({
            success: false,
            message: 'This content is not available for your grade',
          });
        }
      }

      // Record view in activity_logs
      if (req.user && req.user.id) {
        try {
          await pool.query(
            `INSERT INTO activity_logs (user_id, action, resource_type, resource_id)
             VALUES ($1, 'view_study_session', 'study_library_content', $2)`,
            [req.user.id, actualId]
          );
        } catch (logError) {
          // Don't fail the request if logging fails
          console.error('Failed to log view:', logError);
        }
      }

      // Format admin content to match expected session format
      const session = {
        id: `admin_${content.id}`,
        lesson_title: content.title,
        topic: content.subject || (content.is_general ? 'General' : 'Study Material'),
        subject: content.subject || '',
        grade: content.grade || null,
        is_general: content.is_general || false,
        age: content.age_group ? parseInt(content.age_group.split('-')[0]) : null,
        difficulty: content.difficulty || '',
        language: content.language || 'English',
        lesson_introduction: content.description || '',
        lesson_summary: content.description || '',
        lesson_explanation: null,
        lesson_key_points: null,
        lesson_examples: null,
        created_by_name: content.created_by_name || 'Admin',
        created_by_id: content.created_by_id || null,
        timestamp: content.created_at || content.publish_date,
        content_source: 'admin_content',
        contentType: content.content_type,
        fileUrl: content.file_url,
        fileName: content.file_name,
        fileSize: content.file_size,
        textContent: content.text_content,
        description: content.description,
      };

      res.json({
        success: true,
        session,
      });
      return;
    }

    // Regular study session lookup
    const result = await pool.query(
      `SELECT 
        ss.*,
        u.name as created_by_name,
        u.id as created_by_id
      FROM study_sessions ss
      INNER JOIN users u ON ss.user_id = u.id
      WHERE ss.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Study session not found',
      });
    }

    const session = result.rows[0];

    // Record view in activity_logs
    try {
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, resource_type, resource_id)
         VALUES ($1, 'view_study_session', 'study_session', $2)`,
        [req.user.id, id]
      );
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Failed to log view:', logError);
    }

    // Parse JSON fields
    const parsedSession = mapStudySessionRow(session);

    res.json({
      success: true,
      session: parsedSession,
    });
  } catch (error) {
    console.error('Error in GET /api/study-library/:id:', error);
    // Send more detailed error information in development
    if (process.env.NODE_ENV === 'development') {
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        error: error.stack,
      });
    }
    next(error);
  }
});

module.exports = router;

