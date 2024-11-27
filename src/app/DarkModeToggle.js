// DarkModeToggle.js
"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function DarkModeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, systemTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState("light"); // Default to light

  useEffect(() => {
    setMounted(true);
    // Set initial theme after mount
    const initialTheme = theme === "system" ? systemTheme : theme;
    setCurrentTheme(initialTheme || "light");
  }, [theme, systemTheme]);

  if (!mounted) {
    // Return a placeholder with matching dimensions
    return (
      <div className="flex items-center">
        <div className="w-16 h-8 bg-gray-200 rounded-full" aria-hidden="true" />
        <div className="ml-4 w-20 h-6 bg-gray-200 rounded" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <button
        type="button"
        className="relative inline-flex h-8 w-16 items-center rounded-full 
                 bg-gray-200 transition-all duration-300 ease-in-out
                 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                 focus:outline-none focus:ring-2 focus:ring-blue-500 
                 focus:ring-offset-2 shadow-sm"
        onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
        role="switch"
        aria-checked={currentTheme === "dark"}
      >
        <span className="sr-only">Toggle dark mode</span>
        <span
          className={`
            ${currentTheme === "dark" ? "translate-x-9" : "translate-x-1"}
            inline-block h-6 w-6 transform rounded-full 
            bg-white transition-all duration-300 ease-in-out
            shadow-md flex items-center justify-center
          `}
        >
          {currentTheme === "dark" ? (
            <svg
              className="h-4 w-4 text-gray-700"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          ) : (
            <svg
              className="h-4 w-4 text-yellow-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
            </svg>
          )}
        </span>
      </button>
      <span
        className={`ml-4 text-base font-bold ${
          currentTheme === "dark" ? "text-gray-300" : "text-gray-900"
        }`}
      >
        Dark Mode
      </span>
    </div>
  );
}
