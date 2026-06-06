/**
 * Study Library Content API routes
 * Handles file uploads (PPT, PDF, Text) for Study Library with CRUD operations
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/study-library');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const ALLOWED_EXTENSIONS = new Set([
  '.ppt', '.pptx', '.pdf', '.txt',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico', '.tif', '.tiff', '.heic', '.avif',
  '.doc', '.docx', '.odt', '.rtf',
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'application/rtf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  'image/x-icon',
  'image/tiff',
  'image/heic',
  'image/heif',
  'image/avif',
]);

/** ppt | pdf | text | image | doc */
const VALID_CONTENT_TYPES = ['ppt', 'pdf', 'text', 'image', 'doc'];

const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico', '.tif', '.tiff', '.heic', '.avif',
]);

const DOC_EXTENSIONS = new Set(['.doc', '.docx', '.odt', '.rtf']);

const isAllowedUpload = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ext && ALLOWED_EXTENSIONS.has(ext)) return true;
  const mime = String(file.mimetype || '').toLowerCase();
  if (ALLOWED_MIME_TYPES.has(mime)) return true;
  if (mime.startsWith('image/')) return true;
  return false;
};

const fileFilter = (req, file, cb) => {
  if (isAllowedUpload(file)) {
    cb(null, true);
    return;
  }
  cb(
    new Error(
      'Invalid file type. Allowed: PDF, PPT, TXT, images (JPG/PNG/GIF/WebP/BMP/SVG/etc.), DOC/DOCX/ODT/RTF.'
    ),
    false
  );
};

const inferContentTypeFromFile = (filename, mimetype) => {
  const ext = path.extname(filename || '').toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (DOC_EXTENSIONS.has(ext)) return 'doc';
  if (ext === '.pdf') return 'pdf';
  if (['.ppt', '.pptx'].includes(ext)) return 'ppt';
  if (ext === '.txt') return 'text';

  const mime = String(mimetype || '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (
    mime.includes('word') ||
    mime === 'application/msword' ||
    mime === 'application/rtf' ||
    mime.includes('opendocument.text')
  ) {
    return 'doc';
  }
  if (mime === 'application/pdf') return 'pdf';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'ppt';
  if (mime === 'text/plain') return 'text';
  return null;
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

/**
 * Get all study library content (admin)
 * GET /api/admin/study-library-content?page=1&limit=20&contentType=pdf&isPublished=true
 */
router.get('/', checkPermission('manage_study_material'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, contentType, isPublished, subject, ageGroup, grade, isGeneral } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
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
        slc.is_published as "isPublished",
        slc.created_by as "createdBy",
        slc.created_at as "createdAt",
        slc.updated_at as "updatedAt",
        slc.view_count as "viewCount",
        u.name as created_by_name,
        u.email as created_by_email
      FROM study_library_content slc
      LEFT JOIN users u ON slc.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (contentType) {
      paramCount++;
      query += ` AND slc.content_type = $${paramCount}`;
      params.push(contentType);
    }

    if (isPublished !== undefined) {
      paramCount++;
      query += ` AND slc.is_published = $${paramCount}`;
      params.push(isPublished === 'true');
    }

    if (subject) {
      paramCount++;
      query += ` AND slc.subject ILIKE $${paramCount}`;
      params.push(`%${subject}%`);
    }

    if (ageGroup) {
      paramCount++;
      query += ` AND slc.age_group = $${paramCount}`;
      params.push(ageGroup);
    }

    if (grade) {
      paramCount++;
      query += ` AND slc.grade = $${paramCount}`;
      params.push(grade);
    }

    if (isGeneral !== undefined) {
      paramCount++;
      query += ` AND slc.is_general = $${paramCount}`;
      params.push(isGeneral === 'true');
    }

    query += ` ORDER BY slc.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM study_library_content WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (contentType) {
      countParamCount++;
      countQuery += ` AND content_type = $${countParamCount}`;
      countParams.push(contentType);
    }

    if (isPublished !== undefined) {
      countParamCount++;
      countQuery += ` AND is_published = $${countParamCount}`;
      countParams.push(isPublished === 'true');
    }

    if (subject) {
      countParamCount++;
      countQuery += ` AND subject ILIKE $${countParamCount}`;
      countParams.push(`%${subject}%`);
    }

    if (ageGroup) {
      countParamCount++;
      countQuery += ` AND age_group = $${countParamCount}`;
      countParams.push(ageGroup);
    }

    if (grade) {
      countParamCount++;
      countQuery += ` AND grade = $${countParamCount}`;
      countParams.push(grade);
    }

    if (isGeneral !== undefined) {
      countParamCount++;
      countQuery += ` AND is_general = $${countParamCount}`;
      countParams.push(isGeneral === 'true');
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      content: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get study library content by ID
 * GET /api/admin/study-library-content/:id
 */
router.get('/:id', checkPermission('manage_study_material'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
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
        slc.is_published as "isPublished",
        slc.created_by as "createdBy",
        slc.created_at as "createdAt",
        slc.updated_at as "updatedAt",
        slc.view_count as "viewCount",
        u.name as created_by_name,
        u.email as created_by_email
      FROM study_library_content slc
      LEFT JOIN users u ON slc.created_by = u.id
      WHERE slc.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Study library content not found',
      });
    }

    res.json({
      success: true,
      content: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create study library content with file upload
 * POST /api/admin/study-library-content
 */
router.post('/', checkPermission('manage_study_material'), upload.single('file'), async (req, res, next) => {
  try {
    const {
      title,
      description,
      contentType,
      textContent,
      subject,
      grade,
      isGeneral,
      ageGroup,
      difficulty,
      language,
      publishDate,
      isPublished,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required',
      });
    }

    let resolvedContentType = contentType;
    if (req.file) {
      const inferred = inferContentTypeFromFile(req.file.originalname, req.file.mimetype);
      if (inferred) resolvedContentType = inferred;
    }

    if (!resolvedContentType) {
      return res.status(400).json({
        success: false,
        message: 'Content type is required (or upload a supported file)',
      });
    }

    if (!VALID_CONTENT_TYPES.includes(resolvedContentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid content type. Must be one of: ${VALID_CONTENT_TYPES.join(', ')}`,
      });
    }

    const fileRequiredTypes = ['ppt', 'pdf', 'image', 'doc'];
    if (fileRequiredTypes.includes(resolvedContentType) && !req.file) {
      return res.status(400).json({
        success: false,
        message: `File is required for ${resolvedContentType} content`,
      });
    }

    // Validate text content for text type
    if (resolvedContentType === 'text' && !textContent && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Text content or file is required for text content type',
      });
    }

    const generalFlag = isGeneral === 'true' || isGeneral === true;

    let fileUrl = null;
    let fileName = null;
    let fileSize = null;
    let finalTextContent = textContent || null;

    // Handle file upload
    if (req.file) {
      fileUrl = `/uploads/study-library/${req.file.filename}`;
      fileName = req.file.originalname;
      fileSize = req.file.size;

      // If it's a text file, read its content
      if (resolvedContentType === 'text' && req.file.mimetype === 'text/plain') {
        finalTextContent = fs.readFileSync(req.file.path, 'utf8');
      }
    }

    const result = await pool.query(
      `INSERT INTO study_library_content (
        title, description, content_type, file_url, file_name, file_size,
        text_content, subject, grade, is_general, age_group, difficulty, language,
        publish_date, is_published, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING 
        id,
        title,
        description,
        content_type as "contentType",
        file_url as "fileUrl",
        file_name as "fileName",
        file_size as "fileSize",
        text_content as "textContent",
        subject,
        grade,
        is_general as "isGeneral",
        age_group as "ageGroup",
        difficulty,
        language,
        publish_date as "publishDate",
        is_published as "isPublished",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt",
        view_count as "viewCount"`,
      [
        title,
        description || null,
        resolvedContentType,
        fileUrl,
        fileName,
        fileSize,
        finalTextContent,
        subject || null,
        grade || null,
        generalFlag,
        ageGroup || null,
        difficulty || null,
        language || 'English',
        publishDate ? new Date(publishDate) : null,
        isPublished === 'true' || isPublished === true,
        req.user.id,
      ]
    );

    res.status(201).json({
      success: true,
      content: result.rows[0],
      message: 'Study library content created successfully',
    });
  } catch (error) {
    // Delete uploaded file if database insert fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

/**
 * Update study library content
 * PUT /api/admin/study-library-content/:id
 */
router.put('/:id', checkPermission('manage_study_material'), upload.single('file'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      contentType,
      textContent,
      subject,
      grade,
      isGeneral,
      ageGroup,
      difficulty,
      language,
      publishDate,
      isPublished,
    } = req.body;

    // Get existing content
    const existingResult = await pool.query('SELECT * FROM study_library_content WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Study library content not found',
      });
    }

    const existing = existingResult.rows[0];

    let fileUrl = existing.file_url;
    let fileName = existing.file_name;
    let fileSize = existing.file_size;
    let finalTextContent = textContent !== undefined ? textContent : existing.text_content;

    // Handle new file upload
    if (req.file) {
      // Delete old file if exists
      if (existing.file_url) {
        const oldFilePath = path.join(__dirname, '../../', existing.file_url);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      fileUrl = `/uploads/study-library/${req.file.filename}`;
      fileName = req.file.originalname;
      fileSize = req.file.size;

      // If it's a text file, read its content
      if (existing.content_type === 'text' && req.file.mimetype === 'text/plain') {
        finalTextContent = fs.readFileSync(req.file.path, 'utf8');
      }
    }

    const updates = [];
    const params = [];
    let paramCount = 0;

    if (req.file) {
      const inferred = inferContentTypeFromFile(req.file.originalname, req.file.mimetype);
      if (inferred) {
        updates.push(`content_type = $${++paramCount}`);
        params.push(inferred);
      }
    }

    if (title !== undefined) {
      updates.push(`title = $${++paramCount}`);
      params.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${++paramCount}`);
      params.push(description);
    }
    if (contentType !== undefined) {
      updates.push(`content_type = $${++paramCount}`);
      params.push(contentType);
    }
    if (fileUrl !== undefined) {
      updates.push(`file_url = $${++paramCount}`);
      params.push(fileUrl);
    }
    if (fileName !== undefined) {
      updates.push(`file_name = $${++paramCount}`);
      params.push(fileName);
    }
    if (fileSize !== undefined) {
      updates.push(`file_size = $${++paramCount}`);
      params.push(fileSize);
    }
    if (finalTextContent !== undefined) {
      updates.push(`text_content = $${++paramCount}`);
      params.push(finalTextContent);
    }
    if (subject !== undefined) {
      updates.push(`subject = $${++paramCount}`);
      params.push(subject || null);
    }
    if (grade !== undefined) {
      updates.push(`grade = $${++paramCount}`);
      params.push(grade || null);
    }
    if (isGeneral !== undefined) {
      updates.push(`is_general = $${++paramCount}`);
      params.push(isGeneral === 'true' || isGeneral === true);
    }
    if (ageGroup !== undefined) {
      updates.push(`age_group = $${++paramCount}`);
      params.push(ageGroup);
    }
    if (difficulty !== undefined) {
      updates.push(`difficulty = $${++paramCount}`);
      params.push(difficulty);
    }
    if (language !== undefined) {
      updates.push(`language = $${++paramCount}`);
      params.push(language);
    }
    if (publishDate !== undefined) {
      updates.push(`publish_date = $${++paramCount}`);
      params.push(publishDate ? new Date(publishDate) : null);
    }
    if (isPublished !== undefined) {
      updates.push(`is_published = $${++paramCount}`);
      params.push(isPublished === 'true' || isPublished === true);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await pool.query(
      `UPDATE study_library_content SET ${updates.join(', ')} WHERE id = $${++paramCount} 
      RETURNING 
        id,
        title,
        description,
        content_type as "contentType",
        file_url as "fileUrl",
        file_name as "fileName",
        file_size as "fileSize",
        text_content as "textContent",
        subject,
        grade,
        is_general as "isGeneral",
        age_group as "ageGroup",
        difficulty,
        language,
        publish_date as "publishDate",
        is_published as "isPublished",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt",
        view_count as "viewCount"`,
      params
    );

    res.json({
      success: true,
      content: result.rows[0],
      message: 'Study library content updated successfully',
    });
  } catch (error) {
    // Delete uploaded file if update fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

/**
 * Delete study library content
 * DELETE /api/admin/study-library-content/:id
 */
router.delete('/:id', checkPermission('manage_study_material'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get content to delete file
    const result = await pool.query('SELECT file_url FROM study_library_content WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Study library content not found',
      });
    }

    // Delete file if exists
    if (result.rows[0].file_url) {
      const filePath = path.join(__dirname, '../../', result.rows[0].file_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from database
    await pool.query('DELETE FROM study_library_content WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Study library content deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

