"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { I18nProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// فیلتر کردن هشدار فالس‌پازیتیو React 19 در محیط توسعه برای تگ script داخلی next-themes
if (process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag while rendering React component")
    ) {
      return;
    }
    originalError(...args);
  };
}

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      {...themeProps}
    >
      <I18nProvider locale="fa-IR-u-ca-persian">{children}</I18nProvider>
    </NextThemesProvider>
  );
}
