/**
 * Application entry point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { FontSizeProvider } from './contexts/FontSizeContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FontSizeProvider>
      <App />
    </FontSizeProvider>
  </React.StrictMode>
);

