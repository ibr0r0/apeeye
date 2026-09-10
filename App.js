import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { WorkspaceProvider } from './src/WorkspaceContext';
import { ToastProvider } from './components/ui';
import Main from './Main';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <WorkspaceProvider>
          <Main />
        </WorkspaceProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
