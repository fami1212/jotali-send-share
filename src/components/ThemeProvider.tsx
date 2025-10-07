import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode } from "react";

export function ThemeProvider({ 
  children, 
  ...props 
}: { 
  children: ReactNode;
  attribute?: "class";
  defaultTheme?: string;
  enableSystem?: boolean;
}) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
