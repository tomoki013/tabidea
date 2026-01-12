import { ReactNode } from "react";

export type HighlightBoxVariant = "info" | "warning" | "danger";

interface HighlightBoxProps {
  variant: HighlightBoxVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<
  HighlightBoxVariant,
  {
    container: string;
    title: string;
    icon: ReactNode;
  }
> = {
  info: {
    container:
      "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700",
    title: "text-slate-800 dark:text-slate-200",
    icon: (
      <svg
        className="w-5 h-5 text-slate-600 dark:text-slate-400 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  warning: {
    container:
      "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800",
    title: "text-amber-800 dark:text-amber-200",
    icon: (
      <svg
        className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
  danger: {
    container:
      "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800",
    title: "text-red-800 dark:text-red-200",
    icon: (
      <svg
        className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
};

export default function HighlightBox({
  variant,
  title,
  children,
  className = "",
}: HighlightBoxProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={`rounded-lg p-4 ${styles.container} ${className}`}
      role="note"
    >
      {title && (
        <div className="flex items-center gap-2 mb-3">
          {styles.icon}
          <p className={`font-bold ${styles.title}`}>{title}</p>
        </div>
      )}
      <div
        className={`${variant === "danger" ? "text-red-900 dark:text-red-100" : variant === "warning" ? "text-amber-900 dark:text-amber-100" : "text-slate-700 dark:text-slate-300"}`}
      >
        {children}
      </div>
    </div>
  );
}
