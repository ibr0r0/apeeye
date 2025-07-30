import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); 
  const [mode, setMode] = useState('system');

  const scheme = mode === 'system' ? systemScheme : mode;
  const isDark = scheme === 'dark';

  const colors = {
    background: isDark ? '#0d1117' : '#f6f8fa',
    text: isDark ? '#c9d1d9' : '#0d1117',
    button: isDark ? '#238636' : '#2da44e',
    buttonText: '#ffffff',
    border: isDark ? '#30363d' : '#d0d7de',
    toggleText: isDark ? '#8b949e' : '#666',
    surface: isDark ? '#1e1e22' : '#f2f2f7', 

  };


  return (
    <ThemeContext.Provider value={{ mode, setMode, scheme, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
