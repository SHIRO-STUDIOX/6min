"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { I18nProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

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
