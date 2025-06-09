'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { useIDEStore } from '@/store/ide-store'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { SearchAddon } from '@xterm/addon-search'
import { WebglAddon } from '@xterm/addon-webgl'
import { TerminalRef } from './integrated-terminal'
import { TerminalSearch } from './terminal-search'

interface PowerShellTerminalProps {
    className?: string
}

export const PowerShellTerminal = forwardRef<TerminalRef, PowerShellTerminalProps>(
    function PowerShellTerminal({ className }, ref) {
        const terminalRef = useRef<HTMLDivElement>(null)
        const xtermRef = useRef<XTerm | null>(null)
        const fitAddonRef = useRef<FitAddon | null>(null)
        const searchAddonRef = useRef<SearchAddon | null>(null)
        const webglAddonRef = useRef<WebglAddon | null>(null)
        const { theme } = useIDEStore()
        const [sessionId] = useState(`powershell-${Date.now()}`)
        const [currentDirectory, setCurrentDirectory] = useState('/')
        const terminalCwd = useIDEStore(state => state.terminalCwd)
        const [commandHistory, setCommandHistory] = useState<string[]>([])
        const [historyIndex, setHistoryIndex] = useState(-1)
        const [currentCommand, setCurrentCommand] = useState('')
        const [showSearch, setShowSearch] = useState(false)

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
                const savedState = localStorage.getItem('powershell-terminal-state')
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
                console.error('Failed to load PowerShell terminal state:', error)
            }
        }, [])

        // Save state to localStorage when it changes
        useEffect(() => {
            try {
                const stateToSave = {
                    history: commandHistory.slice(0, 100), // Limit to 100 entries
                    cwd: currentDirectory
                }
                localStorage.setItem('powershell-terminal-state', JSON.stringify(stateToSave))
            } catch (error) {
                console.error('Failed to save PowerShell terminal state:', error)
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
                            background: '#012456',
                            foreground: '#ffffff',
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
                            background: '#f6f6f6',
                            foreground: '#012456',
                            cursor: '#012456',
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
                                console.log('WebGL renderer loaded for PowerShell terminal')
                            } else {
                                console.log('WebGL not supported in this environment')
                            }
                        } catch (e) {
                            console.warn('WebGL renderer failed to initialize for PowerShell', e)
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
                    console.warn('WebGL renderer not available for PowerShell terminal', e)
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
                terminal.writeln('Windows PowerShell')
                terminal.writeln('Copyright (C) Microsoft Corporation. All rights reserved.')
                terminal.writeln('')
                terminal.writeln('Try the new cross-platform PowerShell https://aka.ms/pscore6')
                terminal.writeln('')
                writePrompt(terminal)

                // Handle user input
                let currentInput = ''
                terminal.onData((data) => {
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

        // Function to write prompt
        const writePrompt = (terminal: XTerm) => {
            // Format the path for PowerShell display
            // Convert Unix-style paths to Windows style for display purposes
            let displayPath = currentDirectory;

            // If it's a Unix-style path from the IDE store, convert it
            if (currentDirectory.startsWith('/')) {
                // Extract project name if in a project directory
                const pathParts = currentDirectory.split('/').filter(Boolean);
                if (pathParts.length > 0) {
                    // Format as a Windows path for the prompt with the project name
                    displayPath = `${process.cwd()}\\${pathParts.join('\\')}`;
                } else {
                    // Root path
                    displayPath = process.cwd();
                }
            }

            terminal.write(`PS ${displayPath}> `)
        }

        // Clear current line
        const clearCurrentLine = (terminal: XTerm, currentText: string) => {
            terminal.write('\r\x1b[K')
            writePrompt(terminal)
        }

        // Execute command
        const executeCommand = async (terminal: XTerm, input: string) => {
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
                case 'set-location':
                    const path = args.join(' ')
                    handleChangeDirectory(path)
                    writePrompt(terminal)
                    return

                case 'pwd':
                case 'get-location':
                    terminal.writeln(currentDirectory)
                    writePrompt(terminal)
                    return

                case 'exit':
                    terminal.writeln('Session closed.')
                    writePrompt(terminal)
                    return
            }

            // Execute command via API
            try {
                terminal.writeln('') // New line after command

                const response = await fetch('/api/terminal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        command: input,
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
                // Go to project root
                newDirectory = '/'
                setCurrentDirectory(newDirectory)
            } else if (path === '..') {
                const parts = currentDirectory.split('/')
                if (parts.length > 2) {
                    parts.pop()
                    newDirectory = parts.join('/') || '/'
                    setCurrentDirectory(newDirectory)
                } else {
                    // Ensure we stay at project root at minimum
                    newDirectory = '/'
                    setCurrentDirectory(newDirectory)
                }
            } else if (path.includes(':')) {
                // For Windows absolute paths, store a normalized version
                const normalized = path.replace(/\\/g, '/');
                newDirectory = normalized;
                setCurrentDirectory(newDirectory)
            } else {
                // Relative path - use Unix style for internal consistency
                path = path.replace(/\\/g, '/');

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

        return (
            <div className="relative h-full">
                {showSearch && (
                    <TerminalSearch
                        searchAddon={searchAddonRef.current}
                        onClose={() => setShowSearch(false)}
                    />
                )}
                <div ref={terminalRef} className={`h-full w-full ${className}`} />
            </div>
        )
    }
) 