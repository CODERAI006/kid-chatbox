/** Shared layout chrome heights for mobile / tablet safe areas. */
export const MOBILE_BOTTOM_NAV_HEIGHT = '4.5rem';
export const COMPACT_FOOTER_HEIGHT = '2.75rem';

/** Mobile Guru chat FAB — keep in sync with GuruChatFab.tsx */
export const GURU_CHAT_FAB_SIZE = '4rem';
export const GURU_CHAT_FAB_ABOVE_NAV = '0.75rem';
export const MOBILE_SHEET_ABOVE_FAB_GAP = '0.75rem';

/** Bottom inset for full-width sheets that must sit above the mobile chat FAB. */
export const MOBILE_SHEET_ABOVE_CHAT_BOTTOM = `calc(${MOBILE_BOTTOM_NAV_HEIGHT} + ${GURU_CHAT_FAB_ABOVE_NAV} + ${GURU_CHAT_FAB_SIZE} + ${MOBILE_SHEET_ABOVE_FAB_GAP} + env(safe-area-inset-bottom, 0px))`;

export const MOBILE_MORE_MENU_Z_INDEX = 1600;
export const MOBILE_MORE_MENU_BACKDROP_Z_INDEX = 1550;
