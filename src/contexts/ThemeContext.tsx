'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'light' | 'dark' | 'color';

interface ThemeContextProps {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('school_app_theme') as AppTheme;
    if (savedTheme && ['light', 'dark', 'color'].includes(savedTheme)) {
      setThemeState(savedTheme);
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('school_app_theme', newTheme);
  };

  useEffect(() => {
    if (!mounted) return;
    const body = document.body;
    body.classList.remove('theme-light', 'theme-dark', 'theme-color');
    body.classList.add(`theme-${theme}`);
    
    // Update data attribute or class on html tag
    const html = document.documentElement;
    html.classList.remove('theme-light', 'theme-dark', 'theme-color');
    html.classList.add(`theme-${theme}`);
  }, [theme, mounted]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
