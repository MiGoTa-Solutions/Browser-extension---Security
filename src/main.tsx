import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { isExtensionContext } from './utils/extensionApi';
import './index.css';

if (isExtensionContext()) {
  document.documentElement.classList.add('extension-popup-root');
  document.body.classList.add('extension-popup-body');
} else {
  document.documentElement.classList.remove('extension-popup-root');
  document.body.classList.remove('extension-popup-body');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
