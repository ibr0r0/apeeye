import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import Main from './Main'; 
export default function App() {
  return (
    <ThemeProvider>
      <Main />
    </ThemeProvider>
  );
}
