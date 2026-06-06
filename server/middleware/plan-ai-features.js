/**
 * Blocks AI Study / AI Quiz features when the user's plan opts out.
 */

const { getUserPlan, getFreemiumPlan } = require('../utils/plans');

const isAdminUser = (user) => Array.isArray(user?.roles) && user.roles.includes('admin');

const checkPlanAiFeature = (feature) => async (req, res, next) => {
  try {
    if (isAdminUser(req.user)) return next();

    const plan = (await getUserPlan(req.user.id)) || (await getFreemiumPlan());
    const hidden =
      feature === 'study' ? Boolean(plan.hide_ai_study) : Boolean(plan.hide_ai_quiz);

    if (hidden) {
      return res.status(403).json({
        success: false,
        message:
          feature === 'study'
            ? 'AI Study Mode is not included in your plan.'
            : 'AI Quiz Mode is not included in your plan.',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkPlanAiStudy: checkPlanAiFeature('study'),
  checkPlanAiQuiz: checkPlanAiFeature('quiz'),
};
