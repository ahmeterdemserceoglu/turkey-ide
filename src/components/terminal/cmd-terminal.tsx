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

interface CmdTerminalProps {
    className?: string;
    isProjectTerminal?: boolean;
    projectPath?: string;
    projectName?: string;
    initialCommands?: string[];
}

export const CmdTerminal = forwardRef<TerminalRef, CmdTerminalProps>(
    function CmdTerminal({ className, isProjectTerminal, projectPath, projectName, initialCommands }, ref) {
        const terminalRef = useRef<HTMLDivElement>(null)
        const xtermRef = useRef<XTerm | null>(null)
        const fitAddonRef = useRef<FitAddon | null>(null)
        const searchAddonRef = useRef<SearchAddon | null>(null)
        const webglAddonRef = useRef<WebglAddon | null>(null)
        const { theme } = useIDEStore()
        const [sessionId] = useState(`cmd-${Date.now()}`)
        const [currentDirectory, setCurrentDirectory] = useState(projectPath || '/')
        const terminalCwd = useIDEStore(state => state.terminalCwd)
        const [commandHistory, setCommandHistory] = useState<string[]>([])
        const [historyIndex, setHistoryIndex] = useState(-1)
        const [currentCommand, setCurrentCommand] = useState('')
        const [showSearch, setShowSearch] = useState(false)
        const [initialCommandsRun, setInitialCommandsRun] = useState(false)

        // Feature flag to enable/disable WebGL
        const [enableWebGL] = useState(() => {
            try {
                // Check if WebGL has been explicitly disabled in localStorage
                const webglDisabled = localStorage.getItem('terminal-webgl-disabled');
                return webglDisabled !== 'true';
            } catch {
                // Default to enabled if localStorage check fails
                return true;
            }
        });

        // Debug props
        useEffect(() => {
            if (isProjectTerminal) {
                console.log(`Terminal props - Path: ${projectPath}, Commands:`, initialCommands);
            }
        }, [isProjectTerminal, projectPath, initialCommands]);

        // Initialize with the current directory from props or IDE store
        useEffect(() => {
            if (projectPath) {
                setCurrentDirectory(projectPath);
            } else if (terminalCwd) {
                setCurrentDirectory(terminalCwd);
            }
        }, [terminalCwd, projectPath]);

        // Load saved state from localStorage on initialization
        useEffect(() => {
            try {
                const savedState = localStorage.getItem('cmd-terminal-state')
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
                console.error('Failed to load CMD terminal state:', error)
            }
        }, [])

        // Save state to localStorage when it changes
        useEffect(() => {
            try {
                const stateToSave = {
                    history: commandHistory.slice(0, 100), // Limit to 100 entries
                    cwd: currentDirectory
                }
                localStorage.setItem('cmd-terminal-state', JSON.stringify(stateToSave))
            } catch (error) {
                console.error('Failed to save CMD terminal state:', error)
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

        // Add a new useEffect specifically for handling initial commands
        useEffect(() => {
            // Check if the terminal is ready and initialCommands are available
            if (xtermRef.current && initialCommands && initialCommands.length > 0 && !initialCommandsRun) {
                // Mark as run to avoid duplicate execution
                setInitialCommandsRun(true);

                console.log('Running initial commands in terminal:', initialCommands);

                // Wait for the terminal to be fully ready
                setTimeout(async () => {
                    // First set the directory if needed
                    if (projectPath) {
                        console.log(`Setting directory to ${projectPath}`);
                        await executeCommand(xtermRef.current!, `cd "${projectPath}"`);

                        // Give extra time before running commands
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    // Execute each command in sequence with a delay between them
                    for (const command of initialCommands) {
                        console.log(`Executing command: ${command}`);
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Longer delay for stability
                        await executeCommand(xtermRef.current!, command);
                    }

                    // When all commands complete, mark the project terminal setup as complete
                    if (isProjectTerminal && projectPath) {
                        // Find the terminal instance in the store
                        const { terminals, setTerminalSetupComplete } = useIDEStore.getState();
                        const terminal = terminals.find(t =>
                            t.isProjectTerminal && t.workingDirectory === projectPath
                        );

                        if (terminal) {
                            console.log(`Marking terminal ${terminal.id} setup as complete`);
                            setTerminalSetupComplete(terminal.id, true);
                        }
                    }

                }, 2000); // Give more time for terminal setup
            }
        }, [xtermRef.current, initialCommandsRun, initialCommands, projectPath, isProjectTerminal]);

        // Fix the terminal initialization by adding back the terminal input handlers
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
                            background: '#0c0c0c',
                            foreground: '#cccccc',
                            cursor: '#ffffff',
                            selectionBackground: '#264f78',
                            black: '#0c0c0c',
                            red: '#c50f1f',
                            green: '#13a10e',
                            yellow: '#c19c00',
                            blue: '#0037da',
                            magenta: '#881798',
                            cyan: '#3a96dd',
                            white: '#cccccc',
                            brightBlack: '#767676',
                            brightRed: '#e74856',
                            brightGreen: '#16c60c',
                            brightYellow: '#f9f1a5',
                            brightBlue: '#3b78ff',
                            brightMagenta: '#b4009e',
                            brightCyan: '#61d6d6',
                            brightWhite: '#f2f2f2'
                        }
                        : {
                            background: '#ffffff',
                            foreground: '#0c0c0c',
                            cursor: '#000000',
                            selectionBackground: '#add6ff',
                            black: '#0c0c0c',
                            red: '#c50f1f',
                            green: '#13a10e',
                            yellow: '#c19c00',
                            blue: '#0037da',
                            magenta: '#881798',
                            cyan: '#3a96dd',
                            white: '#cccccc',
                            brightBlack: '#767676',
                            brightRed: '#e74856',
                            brightGreen: '#16c60c',
                            brightYellow: '#f9f1a5',
                            brightBlue: '#3b78ff',
                            brightMagenta: '#b4009e',
                            brightCyan: '#61d6d6',
                            brightWhite: '#f2f2f2'
                        },
                    scrollback: 3000,
                    convertEol: true,
                    allowTransparency: true,
                });

                // Create addons
                const fitAddon = new FitAddon();
                const webLinksAddon = new WebLinksAddon();
                const searchAddon = new SearchAddon();

                // Load addons
                terminal.loadAddon(fitAddon);
                terminal.loadAddon(webLinksAddon);
                terminal.loadAddon(searchAddon);

                // Open terminal
                terminal.open(terminalRef.current);
                fitAddon.fit();

                // Try to load WebGL addon for better performance
                try {
                    // Make sure the terminal is fully initialized before adding WebGL
                    setTimeout(() => {
                        try {
                            // Skip WebGL if it's been disabled via feature flag
                            if (!enableWebGL) {
                                console.log('WebGL rendering for terminal is disabled by user preference');
                                return;
                            }

                            // More robust check for browser environment and DOM availability
                            if (typeof window !== 'undefined' &&
                                typeof document !== 'undefined' &&
                                document !== null &&
                                typeof document.createElement === 'function' &&
                                'WebGLRenderingContext' in window) {

                                // Check if canvas and WebGL context can be created
                                const canvas = document.createElement('canvas');
                                if (canvas && canvas.getContext && canvas.getContext('webgl')) {
                                    const webglAddon = new WebglAddon();
                                    terminal.loadAddon(webglAddon);
                                    webglAddonRef.current = webglAddon;
                                    console.log('WebGL renderer loaded for CMD terminal');
                                } else {
                                    console.log('WebGL context creation failed, falling back to standard renderer');
                                }
                            } else {
                                console.log('WebGL not supported in this environment');
                            }
                        } catch (e) {
                            console.warn('WebGL renderer failed to initialize for CMD', e);
                            // Clean up any partial initialization
                            if (webglAddonRef.current) {
                                try {
                                    webglAddonRef.current.dispose();
                                } catch (disposeError) {
                                    console.error('Error disposing WebGL addon:', disposeError);
                                }
                                webglAddonRef.current = null;
                            }

                            // Store the failure in localStorage to avoid repeated attempts
                            try {
                                localStorage.setItem('terminal-webgl-disabled', 'true');
                                console.log('WebGL has been disabled for future terminal sessions due to initialization failure');
                            } catch (storageError) {
                                console.error('Failed to update localStorage settings:', storageError);
                            }
                        }
                    }, 300); // Increased delay to ensure terminal and DOM are ready
                } catch (e) {
                    console.warn('Error initializing WebGL renderer:', e);
                }

                // Record the terminal in refs
                xtermRef.current = terminal;
                fitAddonRef.current = fitAddon;
                searchAddonRef.current = searchAddon;

                // Write initial welcome message
                terminal.writeln('Microsoft Windows [Version 10.0.19045.3930]');
                terminal.writeln('(c) Microsoft Corporation. All rights reserved.');
                terminal.writeln('');

                // Write project info if this is a project terminal
                if (isProjectTerminal && projectName) {
                    terminal.writeln(`Proje Terminali: ${projectName}`);
                    terminal.writeln(`Konum: ${currentDirectory}`);
                    terminal.writeln('');
                }

                // Write the prompt
                writePrompt(terminal);

                // Note: initialCommands are handled in a separate useEffect

                // Handle user input
                let currentInput = '';
                terminal.onData((data) => {
                    const code = data.charCodeAt(0);

                    if (code === 13) { // Enter
                        terminal.writeln('');

                        if (currentInput.trim()) {
                            // Add to history, but avoid duplicates
                            if (commandHistory.length === 0 || commandHistory[0] !== currentInput) {
                                setCommandHistory(prev => [currentInput, ...prev].slice(0, 100));
                            }
                            executeCommand(terminal, currentInput);
                        } else {
                            writePrompt(terminal);
                        }

                        currentInput = '';
                        setHistoryIndex(-1);
                        setCurrentCommand('');
                    } else if (code === 127) { // Backspace
                        if (currentInput.length > 0) {
                            currentInput = currentInput.substring(0, currentInput.length - 1);
                            setCurrentCommand(currentInput);
                            terminal.write('\b \b');
                        }
                    } else if (data === '\x1b[A') { // Up arrow
                        if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
                            const newIndex = historyIndex + 1;
                            const command = commandHistory[newIndex];
                            clearCurrentLine(terminal, currentInput);
                            terminal.write(command);
                            currentInput = command;
                            setCurrentCommand(command);
                            setHistoryIndex(newIndex);
                        }
                    } else if (data === '\x1b[B') { // Down arrow
                        if (historyIndex > 0) {
                            const newIndex = historyIndex - 1;
                            const command = commandHistory[newIndex];
                            clearCurrentLine(terminal, currentInput);
                            terminal.write(command);
                            currentInput = command;
                            setCurrentCommand(command);
                            setHistoryIndex(newIndex);
                        } else if (historyIndex === 0) {
                            clearCurrentLine(terminal, currentInput);
                            currentInput = '';
                            setCurrentCommand('');
                            setHistoryIndex(-1);
                        }
                    } else if (code === 3) { // Ctrl+C
                        terminal.writeln('^C');
                        writePrompt(terminal);
                        currentInput = '';
                        setCurrentCommand('');
                        setHistoryIndex(-1);
                    } else if (code >= 32) { // Printable characters
                        currentInput += data;
                        setCurrentCommand(currentInput);
                        terminal.write(data);
                    }
                });

                // Handle resize
                const handleResize = () => {
                    fitAddon.fit();
                };

                window.addEventListener('resize', handleResize);

                return () => {
                    window.removeEventListener('resize', handleResize);

                    // Properly dispose WebGL addon first if it exists
                    if (webglAddonRef.current) {
                        try {
                            webglAddonRef.current.dispose();
                        } catch (e) {
                            console.error('Error disposing WebGL addon during cleanup:', e);
                        }
                        webglAddonRef.current = null;
                    }

                    // Then dispose the terminal
                    if (xtermRef.current) {
                        try {
                            xtermRef.current.dispose();
                        } catch (e) {
                            console.error('Error disposing terminal during cleanup:', e);
                        }
                        xtermRef.current = null;
                    }
                };
            };

            initTerminal();

        }, [currentDirectory, isProjectTerminal, projectName, theme, commandHistory]);

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
            // Format the path for CMD display
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

            terminal.write(`${displayPath}>`)
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
                case 'cls':
                    terminal.write('\x1b[2J\x1b[3J\x1b[H')
                    writePrompt(terminal)
                    return

                case 'cd':
                    const path = args.join(' ')
                    handleChangeDirectory(path)
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

            if (!path || path === '\\') {
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