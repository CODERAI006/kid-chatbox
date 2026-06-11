/** Shared layout styles so chat bubbles and cards fit narrow viewports. */
export const chatResponsiveTextSx = {
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
} as const;

export const chatMessageContainerProps = {
  minW: 0,
  maxW: '100%',
  w: '100%',
} as const;
