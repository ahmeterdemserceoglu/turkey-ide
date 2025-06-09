'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { useIDEStore } from '@/store/ide-store'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { TerminalRef } from './integrated-terminal'

interface LinuxTerminalProps {
    className?: string
}

// BusyBox - Minimal Linux komutları
const BUSYBOX_COMMANDS = {
    ls: (args: string) => {
        return `
bin   dev  etc  home  lib   proc  sys  tmp  usr  var
    `.trim()
    },
    cat: (args: string) => {
        const file = args.trim()
        const files: Record<string, string> = {
            '/etc/passwd': 'root:x:0:0:root:/root:/bin/bash\nuser:x:1000:1000:Linux User,,,:/home/user:/bin/bash',
            '/etc/hostname': 'turkeyide',
            '/etc/os-release': 'PRETTY_NAME="TurkeyIDE Linux"\nNAME="TurkeyIDE Linux"\nVERSION="1.0"\nID=turkeyide\nHOME_URL="https://turkeyide.dev/"',
            '/proc/version': 'Linux version 6.1.0-turkeyide (root@turkeyide) (gcc version 12.2.0) #1 SMP PREEMPT_DYNAMIC',
            '/proc/cpuinfo': 'processor\t: 0\nvendor_id\t: TurkeyIDE\nmodel name\t: TurkeyIDE Virtual CPU\n'
        }

        if (file.startsWith('/')) {
            return files[file] || `cat: ${file}: No such file or directory`
        } else {
            return files[`/${file}`] || `cat: ${file}: No such file or directory`
        }
    },
    pwd: () => '/home/user',
    whoami: () => 'user',
    id: () => 'uid=1000(user) gid=1000(user) groups=1000(user),4(adm),27(sudo)',
    echo: (args: string) => args,
    uname: (args: string) => {
        if (args.includes('-a')) {
            return 'Linux turkeyide 6.1.0-turkeyide #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux'
        }
        return 'Linux'
    },
    date: () => new Date().toString(),
    ps: () => {
        return `
  PID TTY          TIME CMD
    1 ?        00:00:01 init
   42 ?        00:00:00 sshd
  112 pts/0    00:00:00 bash
  237 pts/0    00:00:00 ps
    `.trim()
    },
    df: () => {
        return `
Filesystem     1K-blocks    Used Available Use% Mounted on
overlay         61255492 3684576  54428204   7% /
tmpfs             504312       0    504312   0% /dev
tmpfs            1013616       0   1013616   0% /sys/fs/cgroup
shm                65536       0     65536   0% /dev/shm
/dev/vda1       61255492 3684576  54428204   7% /etc/hosts
    `.trim()
    },
    free: () => {
        return `
               total        used        free      shared  buff/cache   available
Mem:         2027232      234212     1238648       16536      554372     1639560
Swap:        1048572           0     1048572
    `.trim()
    },
    help: () => {
        return `
Built-in commands:
  ls      - list directory contents
  cat     - concatenate files and print on the standard output
  pwd     - print name of current/working directory
  whoami  - print effective userid
  echo    - display a line of text
  uname   - print system information
  date    - print or set the system date and time
  ps      - report a snapshot of the current processes
  df      - report file system disk space usage
  free    - display amount of free and used memory in the system
  clear   - clear the terminal screen
  exit    - exit the shell
  help    - display this help information
    `.trim()
    },
    clear: () => '\x1b[2J\x1b[3J\x1b[H',
}

export const LinuxTerminal = forwardRef<TerminalRef, LinuxTerminalProps>(
    function LinuxTerminal({ className }, ref) {
        const terminalRef = useRef<HTMLDivElement>(null)
        const xtermRef = useRef<XTerm | null>(null)
        const fitAddonRef = useRef<FitAddon | null>(null)
        const { theme } = useIDEStore()
        const [currentDirectory, setCurrentDirectory] = useState('/home/user')
        const [commandHistory, setCommandHistory] = useState<string[]>([])
        const [historyIndex, setHistoryIndex] = useState(-1)
        const [currentCommand, setCurrentCommand] = useState('')

        // Ref ile terminal işlevlerini dışa aktarma
        useImperativeHandle(ref, () => ({
            clear: () => {
                if (xtermRef.current) {
                    xtermRef.current.write('\x1b[2J\x1b[3J\x1b[H')
                    writePrompt(xtermRef.current)
                }
            },
            search: () => {
                // Search functionality not implemented for Linux terminal
                console.log('Search not implemented for Linux terminal')
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
                        ? { background: '#0c0c0c', foreground: '#ffffff' }
                        : { background: '#f8f8f8', foreground: '#000000' },
                    scrollback: 3000,
                    convertEol: true,
                })

                // Create addons
                const fitAddon = new FitAddon()
                const webLinksAddon = new WebLinksAddon()

                // Load addons
                terminal.loadAddon(fitAddon)
                terminal.loadAddon(webLinksAddon)

                // Open terminal
                terminal.open(terminalRef.current)
                fitAddon.fit()

                // Store references
                xtermRef.current = terminal
                fitAddonRef.current = fitAddon

                // Display welcome message
                terminal.writeln('\x1b[1;32mWelcome to TurkeyIDE Linux Terminal\x1b[0m')
                terminal.writeln('\x1b[90mType "help" for available commands\x1b[0m')
                terminal.writeln('')
                writePrompt(terminal)

                // Handle user input
                let currentInput = ''
                terminal.onData((data) => {
                    const code = data.charCodeAt(0)

                    if (code === 13) { // Enter
                        terminal.writeln('')

                        if (currentInput.trim()) {
                            // Add to history
                            setCommandHistory(prev => [currentInput, ...prev].slice(0, 50))
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

        // Function to write prompt
        const writePrompt = (terminal: XTerm) => {
            terminal.write('\x1b[32muser@turkeyide\x1b[0m:\x1b[34m' + currentDirectory + '\x1b[0m$ ')
        }

        // Clear current line
        const clearCurrentLine = (terminal: XTerm, currentText: string) => {
            terminal.write('\r\x1b[K')
            writePrompt(terminal)
        }

        // Execute command
        const executeCommand = (terminal: XTerm, input: string) => {
            const parts = input.trim().split(' ')
            const command = parts[0]
            const args = parts.slice(1).join(' ')

            if (command === 'exit') {
                terminal.writeln('Goodbye!')
                return
            }

            if (command === 'cd') {
                const target = args || '/home/user'

                // Simulate directory change
                if (target === '..') {
                    const parts = currentDirectory.split('/')
                    if (parts.length > 2) { // Don't go above root
                        parts.pop()
                        setCurrentDirectory(parts.join('/'))
                    }
                } else if (target.startsWith('/')) {
                    // Absolute path
                    setCurrentDirectory(target)
                } else {
                    // Relative path
                    setCurrentDirectory(`${currentDirectory}/${target}`)
                }

                writePrompt(terminal)
                return
            }

            // Execute busybox command if available
            const commandFn = (BUSYBOX_COMMANDS as any)[command]
            if (commandFn) {
                const output = commandFn(args)
                if (output) {
                    terminal.writeln(output)
                }
            } else {
                terminal.writeln(`bash: ${command}: command not found`)
            }

            writePrompt(terminal)
        }

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

        return (
            <div className={`h-full ${className}`}>
                <div className="flex items-center justify-between px-2 py-1 border-b bg-accent/30">
                    <div className="flex items-center gap-1 text-xs">
                        <span className="font-medium">Linux Terminal</span>
                    </div>
                </div>
                <div ref={terminalRef} className="h-[calc(100%-28px)] w-full" style={{ overflow: 'hidden' }} />
            </div>
        )
    }
) 