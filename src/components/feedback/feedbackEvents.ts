import type { FeedbackContext } from '@/types/feedback';

export const FEEDBACK_OPEN_EVENT = 'app-feedback:open';

type OpenDetail = Partial<FeedbackContext>;

export const openAppFeedback = (detail?: OpenDetail) => {
  window.dispatchEvent(new CustomEvent(FEEDBACK_OPEN_EVENT, { detail: detail ?? {} }));
};
