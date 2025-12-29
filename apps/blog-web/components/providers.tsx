"use client"

import { MantineProvider } from "@mantine/core"
import { SessionProvider } from "next-auth/react"
import { ReactNode } from "react"

import { mantineTheme } from "./mantine/theme"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <MantineProvider theme={mantineTheme} defaultColorScheme="dark" forceColorScheme="dark">
        {children}
      </MantineProvider>
    </SessionProvider>
  )
}
