'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { Editor } from '@monaco-editor/react'
import { useIDEStore } from '@/store/ide-store'
import { cn } from '@/lib/utils'

// No global declarations - we'll use type assertions instead

// Monaco editor types
type EditorType = {
  getValue: () => string;
  setValue: (value: string) => void;
  getAction: (actionId: string) => { run: () => Promise<void> };
  getModel: () => { setValue: (content: string) => void } | null;
  layout: () => void;
  updateOptions: (options: Record<string, any>) => void;
  addCommand: (keybinding: number, handler: () => void) => void;
}

interface LintIssue {
  line: number;
  column: number;
  message: string;
  severity: string;
  rule?: string;
  length?: number;
}

interface MonacoEditorProps {
  className?: string
}

export function MonacoEditor({ className }: MonacoEditorProps) {
  const {
    tabs,
    activeTabId,
    updateTabContent,
    theme
  } = useIDEStore()

  const editorRef = useRef<EditorType | null>(null)
  const activeTab = tabs.find(tab => tab.id === activeTabId)
  const containerRef = useRef<HTMLDivElement>(null)

  // Save current file
  const saveCurrentFile = async () => {
    if (!activeTab) return

    try {
      // Format before saving if format on save is enabled
      if (editorRef.current) {
        await formatCurrentFile()
      }

      const response = await fetch('/api/filesystem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: activeTab.path,
          content: activeTab.content,
          action: 'write'
        })
      })

      const result = await response.json()

      if (result.success) {
        // Mark tab as saved
        const { markTabAsSaved } = useIDEStore.getState()
        markTabAsSaved(activeTab.id)

        // You could add a toast notification here
        console.log('File saved successfully')
      } else {
        console.error('Failed to save file:', result.error)
        alert(`Failed to save file: ${result.error}`)
      }
    } catch (error) {
      console.error('Error saving file:', error)
      alert(`Error saving file: ${error}`)
    }
  }

  // Format current file
  const formatCurrentFile = async () => {
    if (!editorRef.current || !activeTab) return

    try {
      // Use Monaco's built-in formatting
      await editorRef.current.getAction('editor.action.formatDocument').run()

      // Get the formatted content and update the tab
      const formattedContent = editorRef.current.getValue()
      updateTabContent(activeTab.id, formattedContent)

      console.log('File formatted successfully')
    } catch (error) {
      console.error('Error formatting file:', error)
    }
  }

  // Lint current file
  /* biome-ignore lint/suspicious/noExplicitAny: Defining complex interfaces would be excessive */
  const lintCurrentFile = useCallback(async () => {
    if (!activeTab) return

    try {
      // Make sure we have valid content
      if (!activeTab.content) {
        console.log('No content to lint')
        return
      }

      const response = await fetch('/api/linter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: activeTab.content,
          language: activeTab.language,
          filename: activeTab.name
        })
      })

      const result = await response.json()

      if (result.issues && result.issues.length > 0) {
        console.log('Linting issues found:', result.issues)
        // Show linting results in Monaco editor
        if (editorRef.current && typeof window !== 'undefined') {
          // Use type assertion for monaco
          const monaco = (window as any).monaco;
          if (monaco) {
            const model = editorRef.current.getModel()
            if (model) {
              const markers = result.issues.map((issue: LintIssue) => ({
                severity: issue.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
                startLineNumber: issue.line || 1,
                startColumn: issue.column || 1,
                endLineNumber: issue.line || 1,
                endColumn: issue.column ? issue.column + (issue.length || 1) : 2,
                message: issue.message
              }))
              monaco.editor.setModelMarkers(model, 'linter', markers)
            }
          }
        }
      } else {
        // Clear any existing markers
        if (editorRef.current && typeof window !== 'undefined') {
          // Use type assertion for monaco
          const monaco = (window as any).monaco;
          if (monaco) {
            const model = editorRef.current.getModel()
            if (model) {
              monaco.editor.setModelMarkers(model, 'linter', [])
            }
          }
        }
      }
    } catch (error) {
      console.error('Error linting file:', error)
    }
  }, [activeTab])

  // Auto-lint on content change with debounce
  useEffect(() => {
    if (!activeTab) return

    const timeoutId = setTimeout(() => {
      lintCurrentFile()
    }, 1000) // 1 second debounce

    return () => clearTimeout(timeoutId)
  }, [activeTab, lintCurrentFile])

  // Kodların görüntülenmesi için Editor'un yüklenmesini takip et
  const [isEditorReady, setIsEditorReady] = useState(false)

  // biome-ignore lint/suspicious/noExplicitAny: Monaco Editor callback requires any type
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor
    setIsEditorReady(true)

    // Configure Monaco editor settings
    monaco.editor.defineTheme('turkey-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
      ],
      colors: {
        'editor.background': '#0f0f0f',
        'editor.foreground': '#ffffff',
        'editorLineNumber.foreground': '#858585',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
      }
    })

    monaco.editor.defineTheme('turkey-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '008000' },
        { token: 'keyword', foreground: '0000FF' },
        { token: 'string', foreground: 'A31515' },
        { token: 'number', foreground: '098658' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#000000',
        'editorLineNumber.foreground': '#237893',
        'editor.selectionBackground': '#add6ff',
        'editor.inactiveSelectionBackground': '#e5ebf1',
      }
    })

    // Set theme
    monaco.editor.setTheme(theme === 'dark' ? 'turkey-dark' : 'turkey-light')

    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      lineHeight: 20,
      minimap: { enabled: true },
      wordWrap: 'on',
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
      suggest: {
        insertMode: 'replace',
        showKeywords: true,
        showSnippets: true,
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false,
      },
      // Ek editor ayarları
      fixedOverflowWidgets: true,
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        verticalScrollbarSize: 14,
        horizontalScrollbarSize: 14,
        alwaysConsumeMouseWheel: false
      },
      contextmenu: true,
      colorDecorators: true,
      mouseWheelZoom: true,
      accessibilitySupport: 'off',
      // Kod görüntüleme için ek ayarlar
      renderLineHighlight: 'all',
      renderControlCharacters: true,
      semanticHighlighting: { enabled: true },
      occurrencesHighlight: true,
      lineNumbersMinChars: 3,
      glyphMargin: true,
      renderFinalNewline: true,
      smoothScrolling: true,
    })

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Save file functionality
      saveCurrentFile()
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      // Find functionality
      editor.getAction('actions.find').run()
    })

    // Format document (Shift+Alt+F)
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      formatCurrentFile()
    })

    // Lint current file (Ctrl+Shift+L)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL, () => {
      lintCurrentFile()
    })

    // İçeriği zorla yenile
    if (activeTab) {
      const model = editor.getModel();
      if (model) {
        model.setValue(activeTab.content);
      }
    }

    // Boyut değişikliklerini manuel olarak yönet
    setTimeout(() => {
      editor.layout();
    }, 100);
  }

  const handleEditorChange = (value: string | undefined) => {
    if (activeTab && value !== undefined) {
      updateTabContent(activeTab.id, value)
    }
  }

  // Update theme when it changes
  useEffect(() => {
    if (editorRef.current && typeof window !== 'undefined' && 'monaco' in window) {
      const monaco = (window as any).monaco;
      monaco.editor.setTheme(theme === 'dark' ? 'turkey-dark' : 'turkey-light')
    }
  }, [theme])

  // Editör yüklendiğinde ve pencere boyutu değiştiğinde yeniden boyutlandırma yap
  useEffect(() => {
    const handleResize = () => {
      if (editorRef.current) {
        editorRef.current.layout();
      }
    };

    window.addEventListener('resize', handleResize);

    // Editör yüklendikten sonra manuel olarak layout() çağrısı yap
    if (isEditorReady && editorRef.current) {
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      }, 200);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isEditorReady, activeTab?.id]);

  // Save file when Ctrl+S is pressed
  useEffect(() => {
    if (editorRef.current && typeof window !== 'undefined' && 'monaco' in window) {
      const monaco = (window as any).monaco;
      const editor = editorRef.current;

      // Add keyboard shortcut for save
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => {
          // Save the file
          if (activeTab) {
            const content = editor.getValue();
            useIDEStore.setState({
              tabs: tabs.map(tab =>
                tab.id === activeTab.id
                  ? { ...tab, content, isDirty: false }
                  : tab
              )
            });

            // If this is a real file, save to filesystem
            if (activeTab.path.startsWith('/')) {
              saveCurrentFile();
            }
          }
        }
      );
    }
  }, [activeTab, saveCurrentFile, tabs]);

  // Original editor UI
  return (
    <div className={cn("w-full h-full flex flex-col", className)} ref={containerRef}>
      {activeTab ? (
        <Editor
          height="100%"
          width="100%"
          defaultLanguage={activeTab.language}
          value={activeTab.content || ''}
          theme={theme === 'dark' ? 'turkey-dark' : 'turkey-light'}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly: false,
            automaticLayout: true,
          }}
          className="h-full"
          loading={<div className="flex h-full w-full items-center justify-center bg-background">Editör yükleniyor...</div>}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <p>No file open</p>
        </div>
      )}
    </div>
  )
}
