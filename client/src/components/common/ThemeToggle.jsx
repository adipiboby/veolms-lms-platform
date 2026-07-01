import { Moon, Sun } from "lucide-react";

import { useTheme } from "../../context/ThemeContext.jsx";

const ThemeToggle = ({ compact = false }) => {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
      title={
        isDark
          ? "Dark mode active. Switch to light mode"
          : "Light mode active. Switch to dark mode"
      }
    >
      {isDark ? <Moon size={17} /> : <Sun size={17} />}

      {!compact && <span>{isDark ? "Dark" : "Light"}</span>}
    </button>
  );
};

export default ThemeToggle;
