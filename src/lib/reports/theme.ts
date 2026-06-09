/** Shared classes for report pages (dark + amber reference UI). */
export const reportTheme = {
  page: "report-theme rounded-xl border border-gray-200 dark:border-zinc-600 bg-gray-50/50 dark:bg-transparent p-5 md:p-6 space-y-5",
  card: "rounded-xl border border-gray-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/40 shadow-sm dark:shadow-none",
  cardPadding: "p-4 md:p-5",
  label: "block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2",
  input:
    "w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 text-sm focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 outline-none",
  pillActive:
    "px-4 py-2 rounded-md text-sm font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors",
  pillInactive:
    "px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-zinc-500 bg-white dark:bg-transparent text-gray-700 dark:text-white hover:border-gray-400 dark:hover:border-zinc-400 transition-colors",
  btnPrimary:
    "inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50",
  btnSecondary:
    "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors",
  btnGhost:
    "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors",
  heading: "text-2xl md:text-3xl font-bold text-gray-900 dark:text-white",
  subheading: "text-lg font-semibold text-gray-900 dark:text-white",
  muted: "text-sm text-gray-500 dark:text-zinc-400",
  positive: "text-emerald-400 font-medium",
} as const;

export const DATE_QUICK_PRESETS = [
  { id: "today" as const, label: "Today" },
  { id: "yesterday" as const, label: "Yesterday" },
  { id: "last3" as const, label: "Last 3 Days" },
  { id: "last7" as const, label: "Last 7 Days" },
];

export type DateQuickPreset = (typeof DATE_QUICK_PRESETS)[number]["id"];
