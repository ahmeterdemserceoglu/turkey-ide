'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { useIDEStore } from '@/store/ide-store'
import { Button } from '@/components/ui/button'
import { Server } from 'lucide-react'
import { SSHDialog, type SSHConnectionDetails } from './ssh-dialog'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { SearchAddon } from '@xterm/addon-search'
import { WebglAddon } from '@xterm/addon-webgl'
import { TerminalRef } from './integrated-terminal'
import { TerminalSearch } from './terminal-search'

// We'll dynamically import xterm only on the client side
type XTermType = any
type FitAddonType = any
type WebLinksAddonType = any
type SearchAddonType = any

interface TerminalProps {
  className?: string
}

export const Terminal = forwardRef<TerminalRef, TerminalProps>(
  function Terminal({ className }, ref) {
    const terminalRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<XTerm | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)
    const searchAddonRef = useRef<SearchAddon | null>(null)
    const webglAddonRef = useRef<WebglAddon | null>(null)
    const { theme } = useIDEStore()
    const [isXtermLoaded, setIsXtermLoaded] = useState(false)
    const [currentDirectory, setCurrentDirectory] = useState('/')
    const [sessionId] = useState(`terminal-${Date.now()}`)
    const terminalCwd = useIDEStore(state => state.terminalCwd)
    const [commandHistory, setCommandHistory] = useState<string[]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)
    const [currentCommand, setCurrentCommand] = useState('')
    const [showSearch, setShowSearch] = useState(false)

    // SSH connection state
    const [sshDialogOpen, setSSHDialogOpen] = useState(false)
    const [sshConnected, setSSHConnected] = useState(false)
    const [sshHost, setSSHHost] = useState('')

    // Initialize with the current directory from IDE store
    useEffect(() => {
      // Set terminal working directory from IDE store
      if (terminalCwd) {
        setCurrentDirectory(terminalCwd)
      }
    }, [terminalCwd])

    // Load saved state from localStorage on initialization
    useEffect(() => {
      try {
        const savedState = localStorage.getItem('bash-terminal-state')
        if (savedState) {
          const parsedState = JSON.parse(savedState)
          if (parsedState.history && Array.isArray(parsedState.history)) {
            setCommandHistory(parsedState.history)
          }
          // Only use saved directory if there's no active directory in IDE store
          if (!terminalCwd && parsedState.cwd && typeof parsedState.cwd === 'string') {
            setCurrentDirectory(parsedState.cwd)
          }
        }
      } catch (error) {
        console.error('Failed to load terminal state:', error)
      }
    }, [])

    // Save state to localStorage when it changes
    useEffect(() => {
      try {
        const stateToSave = {
          history: commandHistory.slice(0, 100), // Limit to 100 entries
          cwd: currentDirectory
        }
        localStorage.setItem('bash-terminal-state', JSON.stringify(stateToSave))
      } catch (error) {
        console.error('Failed to save terminal state:', error)
      }
    }, [commandHistory, currentDirectory])

    // Ref ile terminal işlevlerini dışa aktarma
    useImperativeHandle(ref, () => ({
      clear: () => {
        if (xtermRef.current) {
          xtermRef.current.write('\x1b[2J\x1b[3J\x1b[H')
          writePrompt(xtermRef.current)
        }
      },
      search: () => {
        setShowSearch(true)
      }
    }))

    // Add xterm CSS to document head
    useEffect(() => {
      // Add xterm CSS if not already present
      if (typeof document !== 'undefined' && !document.getElementById('xterm-css')) {
        const link = document.createElement('link')
        link.id = 'xterm-css'
        link.rel = 'stylesheet'
        link.href = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.min.css'
        document.head.appendChild(link)
      }
    }, [])

    useEffect(() => {
      // Initialize terminal
      const initTerminal = async () => {
        if (!terminalRef.current) return

        // Create terminal instance
        const terminal = new XTerm({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Consolas, "Courier New", monospace',
          theme: theme === 'dark'
            ? {
              background: '#000000',
              foreground: '#f2f2f2',
              cursor: '#ffffff',
              selectionBackground: '#264f78',
              black: '#000000',
              red: '#cd3131',
              green: '#0dbc79',
              yellow: '#e5e510',
              blue: '#2472c8',
              magenta: '#bc3fbc',
              cyan: '#11a8cd',
              white: '#e5e5e5',
              brightBlack: '#666666',
              brightRed: '#f14c4c',
              brightGreen: '#23d18b',
              brightYellow: '#f5f543',
              brightBlue: '#3b8eea',
              brightMagenta: '#d670d6',
              brightCyan: '#29b8db',
              brightWhite: '#ffffff'
            }
            : {
              background: '#ffffff',
              foreground: '#000000',
              cursor: '#000000',
              selectionBackground: '#add6ff',
              black: '#000000',
              red: '#cd3131',
              green: '#00bc00',
              yellow: '#949800',
              blue: '#0451a5',
              magenta: '#bc05bc',
              cyan: '#0598bc',
              white: '#555555',
              brightBlack: '#666666',
              brightRed: '#cd3131',
              brightGreen: '#14ce14',
              brightYellow: '#b5ba00',
              brightBlue: '#0451a5',
              brightMagenta: '#bc05bc',
              brightCyan: '#0598bc',
              brightWhite: '#a5a5a5'
            },
          scrollback: 3000,
          convertEol: true,
          allowTransparency: true,
        })

        // Create addons
        const fitAddon = new FitAddon()
        const webLinksAddon = new WebLinksAddon()
        const searchAddon = new SearchAddon()

        // Load addons
        terminal.loadAddon(fitAddon)
        terminal.loadAddon(webLinksAddon)
        terminal.loadAddon(searchAddon)

        // Open terminal
        terminal.open(terminalRef.current)
        fitAddon.fit()

        // Try to load WebGL addon for better performance
        try {
          // Make sure the terminal is fully initialized before adding WebGL
          setTimeout(() => {
            try {
              // Only attempt WebGL if we're in a browser environment with canvas support
              if (typeof window !== 'undefined' &&
                'WebGLRenderingContext' in window &&
                document.createElement('canvas').getContext('webgl')) {
                const webglAddon = new WebglAddon()
                terminal.loadAddon(webglAddon)
                webglAddonRef.current = webglAddon
                console.log('WebGL renderer loaded')
              } else {
                console.log('WebGL not supported in this environment')
              }
            } catch (e) {
              console.warn('WebGL renderer failed to initialize', e)
              // Clean up any partial initialization
              if (webglAddonRef.current) {
                try {
                  webglAddonRef.current.dispose()
                } catch (disposeError) {
                  console.error('Error disposing WebGL addon:', disposeError)
                }
                webglAddonRef.current = null
              }
            }
          }, 100) // Small delay to ensure terminal is ready
        } catch (e) {
          console.warn('WebGL renderer not available', e)
        }

        // Store references
        xtermRef.current = terminal
        fitAddonRef.current = fitAddon
        searchAddonRef.current = searchAddon

        // Enable keyboard shortcuts for search
        terminal.attachCustomKeyEventHandler((event) => {
          // Ctrl+F for search
          if (event.ctrlKey && event.key === 'f' && event.type === 'keydown') {
            setShowSearch(true)
            return false
          }

          // F3 for find next
          if (event.key === 'F3' && event.type === 'keydown') {
            if (searchAddon) {
              if (event.shiftKey) {
                searchAddon.findPrevious('')
              } else {
                searchAddon.findNext('')
              }
            }
            return false
          }

          return true
        })

        // Display welcome message
        terminal.writeln('\x1b[33mGit Bash\x1b[0m')
        terminal.writeln('Based on mintty and msys2')
        terminal.writeln('TurkeyIDE Git Bash Version 2.40.1')
        terminal.writeln('')
        writePrompt(terminal)

        // Handle user input
        let currentInput = ''
        terminal.onData((data) => {
          // If SSH is connected, forward all input to SSH
          if (sshConnected) {
            if (data === '\x03') { // Ctrl+C
              terminal.writeln('^C')
              writePrompt(terminal)
              return
            }

            // For SSH exit command
            if (data === 'e' && currentInput === 'exit') {
              handleSSHDisconnect()
              currentInput = ''
              return
            }

            // Add to current input for monitoring exit command
            if (data.charCodeAt(0) >= 32) {
              currentInput += data
            } else if (data.charCodeAt(0) === 13) { // Enter
              currentInput = ''
            } else if (data.charCodeAt(0) === 127) { // Backspace
              currentInput = currentInput.slice(0, -1)
            }

            // Simply forward all input to SSH
            return
          }

          const code = data.charCodeAt(0)

          if (code === 13) { // Enter
            terminal.writeln('')

            if (currentInput.trim()) {
              // Add to history, but avoid duplicates
              if (commandHistory.length === 0 || commandHistory[0] !== currentInput) {
                setCommandHistory(prev => [currentInput, ...prev].slice(0, 100))
              }
              executeCommand(terminal, currentInput)
            } else {
              writePrompt(terminal)
            }

            currentInput = ''
            setHistoryIndex(-1)
            setCurrentCommand('')
          } else if (code === 127) { // Backspace
            if (currentInput.length > 0) {
              currentInput = currentInput.substring(0, currentInput.length - 1)
              setCurrentCommand(currentInput)
              terminal.write('\b \b')
            }
          } else if (data === '\x1b[A') { // Up arrow
            if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
              const newIndex = historyIndex + 1
              const command = commandHistory[newIndex]
              clearCurrentLine(terminal, currentInput)
              terminal.write(command)
              currentInput = command
              setCurrentCommand(command)
              setHistoryIndex(newIndex)
            }
          } else if (data === '\x1b[B') { // Down arrow
            if (historyIndex > 0) {
              const newIndex = historyIndex - 1
              const command = commandHistory[newIndex]
              clearCurrentLine(terminal, currentInput)
              terminal.write(command)
              currentInput = command
              setCurrentCommand(command)
              setHistoryIndex(newIndex)
            } else if (historyIndex === 0) {
              clearCurrentLine(terminal, currentInput)
              currentInput = ''
              setCurrentCommand('')
              setHistoryIndex(-1)
            }
          } else if (code === 3) { // Ctrl+C
            terminal.writeln('^C')
            writePrompt(terminal)
            currentInput = ''
            setCurrentCommand('')
            setHistoryIndex(-1)
          } else if (code >= 32) { // Printable characters
            currentInput += data
            setCurrentCommand(currentInput)
            terminal.write(data)
          }
        })

        // Handle resize
        const handleResize = () => {
          fitAddon.fit()
        }

        window.addEventListener('resize', handleResize)

        return () => {
          window.removeEventListener('resize', handleResize)
          terminal.dispose()
        }
      }

      initTerminal()
    }, [theme, sshConnected])

    // Update theme when it changes
    useEffect(() => {
      if (xtermRef.current) {
        const terminal = xtermRef.current
        terminal.options.theme = theme === 'dark' ? {
          background: '#0f0f0f',
          foreground: '#ffffff',
          cursor: '#ffffff',
          selectionBackground: '#264f78',
        } : {
          background: '#ffffff',
          foreground: '#000000',
          cursor: '#000000',
          selectionBackground: '#add6ff',
        }
      }
    }, [theme])

    // Resize terminal when container size changes
    useEffect(() => {
      const resizeObserver = new ResizeObserver(() => {
        if (fitAddonRef.current) {
          setTimeout(() => {
            fitAddonRef.current?.fit()
          }, 100)
        }
      })

      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current)
      }

      return () => {
        resizeObserver.disconnect()
      }
    }, [])

    // Change directory when terminalCwd changes
    useEffect(() => {
      if (terminalCwd && currentDirectory && terminalCwd !== currentDirectory) {
        // Send command to terminal API to change directory
        fetch('/api/terminal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            command: `cd "${terminalCwd}"`,
            sessionId: sessionId
          })
        })
          .then(response => response.json())
          .then(data => {
            if (data.cwd) {
              setCurrentDirectory(data.cwd)

              // Write to terminal
              if (xtermRef.current) {
                xtermRef.current.writeln('')
                xtermRef.current.writeln(`\x1b[33mChanged directory to: \x1b[34m${data.cwd}\x1b[0m`)
                xtermRef.current.write(`\r\n\x1b[34m${data.cwd.split('/').pop() || 'root'}\x1b[0m \x1b[32m$\x1b[0m `)
              }
            }
          })
          .catch(error => {
            console.error('Failed to change directory:', error)
            if (xtermRef.current) {
              xtermRef.current.writeln(`\r\n\x1b[31mFailed to change directory: ${error}\x1b[0m`)
            }
          })
      }
    }, [terminalCwd, currentDirectory, sessionId])

    // SSH connection handlers
    const handleSSHConnect = (details: SSHConnectionDetails) => {
      setSSHConnected(true)
      setSSHHost(details.host)

      if (xtermRef.current) {
        xtermRef.current.writeln('')
        xtermRef.current.writeln(`\x1b[32mConnected to SSH server: ${details.host}\x1b[0m`)
        xtermRef.current.writeln('\x1b[90mType "exit" to disconnect\x1b[0m')
        xtermRef.current.writeln('')
      }

      setSSHDialogOpen(false)
    }

    const handleSSHDisconnect = () => {
      setSSHConnected(false)
      setSSHHost('')

      if (xtermRef.current) {
        xtermRef.current.writeln('')
        xtermRef.current.writeln('\x1b[32mDisconnected from SSH server\x1b[0m')
        xtermRef.current.writeln('')
        writePrompt(xtermRef.current)
      }
    }

    // Function to write prompt
    const writePrompt = (terminal: XTerm) => {
      terminal.write(`${currentDirectory} $ `)
    }

    // Clear current line
    const clearCurrentLine = (terminal: XTerm, currentText: string) => {
      terminal.write('\r\x1b[K')
      writePrompt(terminal)
    }

    // Execute command
    const executeCommand = (terminal: XTerm, input: string) => {
      const parts = input.trim().split(' ')
      const command = parts[0].toLowerCase()
      const args = parts.slice(1)

      // Handle internal commands
      switch (command) {
        case 'clear':
        case 'cls':
          terminal.write('\x1b[2J\x1b[3J\x1b[H')
          writePrompt(terminal)
          return

        case 'cd':
          const path = args.join(' ')
          handleChangeDirectory(path)
          writePrompt(terminal)
          return

        case 'pwd':
          terminal.writeln(currentDirectory)
          writePrompt(terminal)
          return

        case 'ssh':
          if (args[0] === 'connect') {
            setSSHDialogOpen(true)
            writePrompt(terminal)
            return
          }
          break

        case 'exit':
          if (sshConnected) {
            handleSSHDisconnect()
            return
          }
          terminal.writeln('Session closed.')
          writePrompt(terminal)
          return
      }

      // Execute command via API
      executeBashCommand(terminal, input)
    }

    // Execute bash command through API
    const executeBashCommand = async (terminal: XTerm, command: string) => {
      try {
        terminal.writeln('') // New line after command

        const response = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command,
            sessionId,
            cwd: currentDirectory
          })
        })

        const data = await response.json()

        if (data.output) {
          terminal.writeln(data.output)
        }

        // Update current directory if changed by the command
        if (data.cwd && data.cwd !== currentDirectory) {
          setCurrentDirectory(data.cwd)
          // Update the global terminal CWD in store
          useIDEStore.getState().setTerminalCwd(data.cwd)
        }

        writePrompt(terminal)
      } catch (error) {
        terminal.writeln(`Error: ${(error as Error).message}`)
        writePrompt(terminal)
      }
    }

    // Handle cd command
    const handleChangeDirectory = (path: string) => {
      let newDirectory = currentDirectory

      if (!path || path === '~') {
        newDirectory = '/' // Go to project root
        setCurrentDirectory(newDirectory)
      } else if (path === '..') {
        const parts = currentDirectory.split('/')
        if (parts.length > 2) { // Don't go above root
          parts.pop()
          newDirectory = parts.join('/') || '/'
          setCurrentDirectory(newDirectory)
        } else {
          newDirectory = '/' // Ensure we stay at project root at minimum
          setCurrentDirectory(newDirectory)
        }
      } else if (path.startsWith('/')) {
        // Absolute path within project
        newDirectory = path
        setCurrentDirectory(newDirectory)
      } else {
        // Relative path
        if (currentDirectory === '/') {
          newDirectory = `/${path}`
        } else {
          newDirectory = `${currentDirectory}/${path}`
        }
        setCurrentDirectory(newDirectory)
      }

      // Update the global terminal CWD in store
      useIDEStore.getState().setTerminalCwd(newDirectory)
    }

    // Show directory listing
    const showDirectoryListing = (terminal: XTerm, args: string) => {
      const isLong = args.includes('-l')

      if (isLong) {
        terminal.writeln('total 40')
        terminal.writeln('drwxr-xr-x 1 user 197121 0 Jun 12 10:30 .')
        terminal.writeln('drwxr-xr-x 1 user 197121 0 Jun 12 10:30 ..')
        terminal.writeln('drwxr-xr-x 1 user 197121 0 Jun 12 10:30 Documents')
        terminal.writeln('drwxr-xr-x 1 user 197121 0 Jun 12 10:30 Downloads')
        terminal.writeln('drwxr-xr-x 1 user 197121 0 Jun 12 10:30 Pictures')
        terminal.writeln('-rw-r--r-- 1 user 197121 8192 Jun 12 09:45 example.txt')
        terminal.writeln('-rw-r--r-- 1 user 197121 24576 Jun 11 15:21 report.docx')
        terminal.writeln('-rw-r--r-- 1 user 197121 102400 Jun 10 11:15 presentation.pptx')
      } else {
        terminal.writeln('Documents  Downloads  Pictures  example.txt  report.docx  presentation.pptx')
      }
    }

    // Handle git commands
    const handleGitCommand = (terminal: XTerm, args: string[]) => {
      const subCommand = args[0]

      switch (subCommand) {
        case 'init':
          terminal.writeln('Initialized empty Git repository in ' + currentDirectory + '/.git/')
          break
        case 'status':
          terminal.writeln('On branch main')
          terminal.writeln('No commits yet')
          terminal.writeln('nothing to commit (create/copy files and use "git add" to track)')
          break
        case 'add':
          terminal.writeln('Added files to staging area')
          break
        case 'commit':
          if (args.includes('-m')) {
            terminal.writeln('[main (root-commit) a1b2c3d] ' + args[args.indexOf('-m') + 1])
            terminal.writeln(' 1 file changed, 0 insertions(+), 0 deletions(-)')
            terminal.writeln(' create mode 100644 example.txt')
          } else {
            terminal.writeln('Please provide a commit message with -m')
          }
          break
        case 'branch':
          terminal.writeln('* main')
          break
        case 'checkout':
          terminal.writeln('Switched to branch \'' + args[1] + '\'')
          break
        case 'version':
          terminal.writeln('git version 2.40.1.windows.1')
          break
        default:
          terminal.writeln('git: \'' + subCommand + '\' is not a git command. See \'git --help\'.')
      }
    }

    // Show help text
    const showHelp = (terminal: XTerm) => {
      terminal.writeln(`
Git Bash Command Reference:
  cd [directory]     - Change directory
  ls [-l]            - List directory contents
  mkdir [directory]  - Create a directory
  pwd                - Print working directory
  echo [text]        - Display text
  cat [file]         - Display file contents
  clear              - Clear screen
  whoami             - Display current user
  uname [-a]         - Display system information
  git [command]      - Git version control commands
  ssh                - Connect to SSH server
  help               - Show this help text
  exit               - Exit Git Bash
      `.trim())
    }

    return (
      <div className="relative h-full">
        {showSearch && (
          <TerminalSearch
            searchAddon={searchAddonRef.current}
            onClose={() => setShowSearch(false)}
          />
        )}
        <div className="h-full">
          <div className="flex items-center justify-between px-2 py-1 border-b bg-accent/30">
            <div className="flex items-center gap-1 text-xs">
              <span className="font-medium">Git Bash</span>
              {sshConnected && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-green-500/20 text-green-600 dark:text-green-400">
                  SSH: {sshHost}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => setSSHDialogOpen(true)}
              >
                <Server className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div ref={terminalRef} className="h-[calc(100%-28px)] w-full" style={{ overflow: 'hidden' }} />
        </div>

        <SSHDialog
          open={sshDialogOpen}
          onOpenChange={setSSHDialogOpen}
          onConnect={handleSSHConnect}
        />
      </div>
    )
  }
)
