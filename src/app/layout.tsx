'use client'

import { Inter } from 'next/font/google'
import { useEffect } from 'react'
import './globals.css'
import { useIDEStore } from '@/store/ide-store'

import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/ui/theme-provider"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { theme, setTerminalCwd, fileTree } = useIDEStore()

  useEffect(() => {
    // Apply theme class to document element
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  // Initialize terminal directory to first project folder
  useEffect(() => {
    // First check if we have any projects in the file tree
    if (fileTree && fileTree.length > 0) {
      // Look for project folders at the root level
      const projectFolders = fileTree.filter(node =>
        node.type === 'folder' && !node.name.startsWith('.')
      );

      if (projectFolders.length > 0) {
        // Use the first project folder as the terminal working directory
        setTerminalCwd(projectFolders[0].path);
        console.log(`Terminal set to project: ${projectFolders[0].path}`);
        return;
      }
    }

    // If no projects in file tree, check localStorage
    try {
      const storage = localStorage.getItem('turkish-ide-storage')
      if (storage) {
        const data = JSON.parse(storage)
        if (data.state?.fileTree) {
          // Find first project folder
          const projects = data.state.fileTree.filter((node: any) =>
            node.type === 'folder' && !node.name.startsWith('.'))

          if (projects.length > 0) {
            // Set terminal directory to first project
            setTerminalCwd(projects[0].path)
            console.log(`Terminal set to stored project: ${projects[0].path}`);
          }
        }
      }
    } catch (error) {
      console.error('Error initializing terminal directory:', error)
    }
  }, [fileTree, setTerminalCwd])

  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <title>TurkeyIDE - Modern Web IDE</title>
        <meta name="description" content="Modern web-based IDE built with Next.js and TypeScript" />
      </head>
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.className)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
