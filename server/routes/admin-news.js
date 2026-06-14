/**
 * Admin — education news pipeline (status + manual sync).
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const { getPipelineStatus, runDailySync } = require('../services/newsPipelineService');

const router = express.Router();

router.use(authenticateToken);
router.use(checkPermission('view_analytics'));

router.get('/status', async (_req, res, next) => {
  try {
    const status = await getPipelineStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

router.post('/sync', async (req, res, next) => {
  try {
    const forceRefresh = Boolean(req.body?.forceRefresh);
    const status = await getPipelineStatus();
    if (status.isRunning) {
      return res.json({ success: false, message: 'Sync already running. Try again in a few minutes.' });
    }

    runDailySync({ forceRefresh, triggerType: 'manual' }).catch((err) => {
      console.error('[admin-news] background sync failed:', err.message);
    });

    const { getRunningPipelineRun } = require('../utils/newsArticleRepo');
    const running = await getRunningPipelineRun();

    res.json({
      success: true,
      message: 'News sync started in the background.',
      runId: running?.id,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
