"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { reportTheme } from "@/lib/reports/theme";

interface ReportToggleButtonProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
  className?: string;
}

export default function ReportToggleButton({
  active,
  onClick,
  children,
  title,
  className,
}: ReportToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={clsx(
        active ? reportTheme.pillActive : reportTheme.pillInactive,
        className,
      )}
    >
      {children}
    </button>
  );
}
