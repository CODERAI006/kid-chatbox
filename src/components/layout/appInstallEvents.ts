export const APP_INSTALL_OPEN_EVENT = 'app-install:open';

export const openAppInstall = () => {
  window.dispatchEvent(new CustomEvent(APP_INSTALL_OPEN_EVENT));
};
