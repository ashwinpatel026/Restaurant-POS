"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import clsx from "clsx";

interface QuickActionButtonProps {
  label: string;
  icon: LucideIcon;
  gradient: string;
  glowColor: string;
  textColor: string;
  href?: string;
  onClick?: () => void;
  delay?: number;
}

export default function QuickActionButton({
  label,
  icon: Icon,
  gradient,
  glowColor,
  textColor,
  href,
  onClick,
  delay = 0,
}: QuickActionButtonProps) {
  const classes = clsx(
    "group relative flex flex-1 items-center justify-center gap-3 rounded-[20px] px-6 py-5",
    "border border-gray-200 font-semibold text-white shadow-md",
    "dark:border-white/[0.08] dark:shadow-none",
    "transition-all duration-300 ease-out",
    "hover:-translate-y-1 hover:scale-[1.02]",
    "animate-dashboard-fade-in opacity-0",
    gradient,
  );

  const style = {
    animationDelay: `${delay}ms`,
    animationFillMode: "forwards" as const,
  };

  const content = (
    <>
      <div
        className="absolute inset-0 rounded-[20px] opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-40"
        style={{ background: glowColor }}
      />
      <Icon className={`relative h-5 w-5 ${textColor}`} strokeWidth={2} />
      <span className={`relative text-sm sm:text-base ${textColor}`}>
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} style={style}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes} style={style}>
      {content}
    </button>
  );
}
