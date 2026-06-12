/**
 * Authentication-related constants
 */

export const LOGIN_CONSTANTS = {
  BRAND_NAME: 'KidChatbox',
  BRAND_LOGO: '📚',
  WELCOME_TITLE: 'Welcome Back!',
  WELCOME_SUBTITLE: 'Sign in to continue your learning journey',
  EMAIL_LABEL: 'Email Address',
  EMAIL_PLACEHOLDER: 'your.email@example.com',
  PASSWORD_LABEL: 'Password',
  PASSWORD_PLACEHOLDER: 'Enter your password',
  LOGIN_BUTTON: 'Sign In',
  GOOGLE_BUTTON: 'Continue with Google',
  GOOGLE_LOADING: 'Loading Google Sign-In...',
  OR_DIVIDER: 'OR',
  NO_ACCOUNT_TEXT: "Don't have an account?",
  SIGN_UP_LINK: 'Sign Up',
  BACK_HOME: 'Back to Home',
  FONT_INCREASE_TOOLTIP: 'Increase font size',
  FONT_DECREASE_TOOLTIP: 'Decrease font size',
  FONT_RESET_TOOLTIP: 'Reset font size',
  LOGIN_ERROR: 'Login failed. Please try again.',
  GOOGLE_ERROR: 'Google login failed. Please try again.',
  GOOGLE_NOT_CONFIGURED: 'Google Sign-In is not configured. Please set VITE_GOOGLE_CLIENT_ID in .env file.',
  GOOGLE_LOADING_ERROR: 'Google Sign-In is still loading. Please wait a moment and try again.',
  GOOGLE_BLOCKED: 'Google Sign-In popup was blocked or not available. Please check your browser settings or use email/password login.',
  GOOGLE_CANCELLED: 'Google Sign-In cancelled. Please try again.',
} as const;

export const REGISTER_CONSTANTS = {
  BRAND_NAME: 'KidChatbox',
  BRAND_LOGO: '📚',
  WELCOME_TITLE: 'Create Account',
  WELCOME_SUBTITLE: 'Join us and start your learning adventure',
  NAME_LABEL: 'Full Name',
  NAME_PLACEHOLDER: 'Enter your full name',
  EMAIL_LABEL: 'Email Address',
  EMAIL_PLACEHOLDER: 'your.email@example.com',
  PASSWORD_LABEL: 'Password',
  PASSWORD_PLACEHOLDER: 'Create a password',
  BIRTH_DATE_LABEL: 'Date of Birth',
  BIRTH_DATE_PLACEHOLDER: 'YYYY-MM-DD',
  BIRTH_DATE_HINT:
    'Age and learning group are calculated automatically from your date of birth.',
  AGE_AUTO_LABEL: 'Calculated from date of birth',
  AGE_OUT_OF_RANGE:
    'Learners must be aged 4 to 99. Please use a valid date of birth.',
  CONFIRM_PASSWORD_LABEL: 'Confirm Password',
  CONFIRM_PASSWORD_PLACEHOLDER: 'Re-enter your password',
  REGISTER_BUTTON: 'Create Account',
  GOOGLE_BUTTON: 'Sign up with Google',
  GOOGLE_LOADING: 'Loading Google Sign-In...',
  OR_DIVIDER: 'OR',
  HAVE_ACCOUNT_TEXT: 'Already have an account?',
  SIGN_IN_LINK: 'Sign In',
  GRADE_LABEL: 'Grade/Class',
  GRADE_PLACEHOLDER: 'Select your grade/class',
  GRADE_REQUIRED: 'Please select your grade or class.',
} as const;

export const GRADES = [
  'Pre-K / Nursery',
  'Class 1 / Grade 1',
  'Class 2 / Grade 2',
  'Class 3 / Grade 3',
  'Class 4 / Grade 4',
  'Class 5 / Grade 5',
  'Class 6 / Grade 6',
  'Class 7 / Grade 7',
  'Class 8 / Grade 8',
  'Class 9 / Grade 9',
  'Class 10 / Grade 10',
  'Class 11 / Grade 11',
  'Class 12 / Grade 12',
  'Graduation',
  'Post Graduation',
] as const;

export type GradeOption = (typeof GRADES)[number];

export function isValidGrade(value: string | undefined | null): value is GradeOption {
  return !!value && (GRADES as readonly string[]).includes(value);
}

