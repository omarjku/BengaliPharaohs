"use client";

// shadcn's dark tokens live under `.dark`; next-themes sets that class from the OS setting.
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider(props: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props} />;
}
