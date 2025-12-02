"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { StoreProvider } from "@/contexts/StoreContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <StoreProvider>{children}</StoreProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
