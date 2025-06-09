import { type NextRequest, NextResponse } from 'next/server'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

// Store terminal sessions
const terminalSessions: Record<string, { cwd: string, env: NodeJS.ProcessEnv }> = {}

// Initial working directory - project root
const PROJECT_ROOT = process.cwd()

// Commands to run with specific applications
const appCommands: Record<string, string> = {
    '.txt': 'notepad',
    '.md': 'code',
    '.js': 'code',
    '.ts': 'code',
    '.jsx': 'code',
    '.tsx': 'code',
    '.json': 'code',
    '.html': 'code',
    '.css': 'code',
    '.scss': 'code',
    '.py': 'python',
    '.jpg': 'mspaint',
    '.png': 'mspaint',
    '.pdf': 'edge',
}

// Helper to check if path is within project root
function isPathWithinProject(checkPath: string): boolean {
    const relative = path.relative(PROJECT_ROOT, checkPath)
    return !relative.startsWith('..') && !path.isAbsolute(relative)
}

// Helper to convert IDE paths to filesystem paths
function idePathToFsPath(idePath: string): string {
    // If it's already a Windows absolute path, return it
    if (idePath.includes(':')) {
        return idePath
    }

    // Handle Unix-style paths from the IDE
    if (idePath.startsWith('/')) {
        // Extract parts without the leading slash
        const pathParts = idePath.split('/').filter(Boolean)

        // Map to project directory
        return path.join(PROJECT_ROOT, ...pathParts)
    }

    // Default to project root for empty or invalid paths
    return PROJECT_ROOT
}

// Helper to convert filesystem paths to IDE paths
function fsPathToIdePath(fsPath: string): string {
    // If not within project, return as is
    if (!isPathWithinProject(fsPath)) {
        return fsPath
    }

    // Get relative path from project root
    const relativePath = path.relative(PROJECT_ROOT, fsPath)

    // Convert to Unix-style path for IDE
    const ideRelativePath = relativePath.replace(/\\/g, '/')

    // Add leading slash
    return ideRelativePath ? `/${ideRelativePath}` : '/'
}

export async function POST(request: NextRequest) {
    try {
        const { command, sessionId = 'default', cwd } = await request.json()

        if (!command) {
            return NextResponse.json({ error: 'Command is required' }, { status: 400 })
        }

        // Initialize or get session - always use PROJECT_ROOT as base
        if (!terminalSessions[sessionId]) {
            terminalSessions[sessionId] = {
                cwd: PROJECT_ROOT,
                env: { ...process.env }
            }
        }

        // Convert IDE path to filesystem path
        const currentCwd = cwd ? idePathToFsPath(cwd) : terminalSessions[sessionId].cwd

        // Security: Basic command filtering
        const dangerousCommands = ['rm -rf /', 'sudo', 'chmod 777', 'chown root', 'passwd', 'su -', 'killall']
        const isDangerous = dangerousCommands.some(cmd => command.toLowerCase().includes(cmd))

        if (isDangerous) {
            return NextResponse.json({
                error: 'Command not allowed for security reasons',
                output: '',
                exitCode: 1,
                cwd: fsPathToIdePath(currentCwd) // Return IDE-style path
            })
        }

        // Special handling for cd command
        if (command.trim().startsWith('cd ')) {
            try {
                const targetDir = command.trim().substring(3).trim()
                let newDir: string

                // Handle ~ expansion - redirect to project root
                if (targetDir === '~' || targetDir.startsWith('~/')) {
                    newDir = targetDir === '~' ? PROJECT_ROOT : path.join(PROJECT_ROOT, targetDir.substring(2))
                } else if (path.isAbsolute(targetDir)) {
                    newDir = targetDir
                } else {
                    newDir = path.resolve(currentCwd, targetDir)
                }

                // Check if directory exists
                if (fs.existsSync(newDir) && fs.statSync(newDir).isDirectory()) {
                    // Ensure we don't escape project root
                    if (!isPathWithinProject(newDir)) {
                        return NextResponse.json({
                            output: `cd: ${targetDir}: Cannot leave project directory`,
                            exitCode: 1,
                            cwd: fsPathToIdePath(currentCwd), // Return IDE-style path
                            command
                        })
                    }

                    terminalSessions[sessionId].cwd = newDir
                    return NextResponse.json({
                        output: '',
                        exitCode: 0,
                        cwd: fsPathToIdePath(newDir), // Return IDE-style path
                        command
                    })
                } else {
                    return NextResponse.json({
                        output: `cd: ${targetDir}: No such directory`,
                        exitCode: 1,
                        cwd: fsPathToIdePath(currentCwd), // Return IDE-style path
                        command
                    })
                }
            } catch (error) {
                return NextResponse.json({
                    output: `cd: error: ${(error as Error).message}`,
                    exitCode: 1,
                    cwd: fsPathToIdePath(currentCwd), // Return IDE-style path
                    command
                })
            }
        }

        // Handle pwd command directly
        if (command.trim() === 'pwd') {
            return NextResponse.json({
                output: fsPathToIdePath(currentCwd), // Return IDE-style path
                exitCode: 0,
                cwd: fsPathToIdePath(currentCwd), // Return IDE-style path
                command
            })
        }

        // Handle open command for files
        if (command.trim().startsWith('open ')) {
            try {
                const filePath = command.trim().substring(5).trim().replace(/"/g, '')
                const fullPath = path.isAbsolute(filePath)
                    ? filePath
                    : path.resolve(currentCwd, filePath)

                // Check if file exists
                if (!fs.existsSync(fullPath)) {
                    return NextResponse.json({
                        output: `open: ${filePath}: No such file`,
                        exitCode: 1,
                        cwd: fsPathToIdePath(currentCwd), // Return IDE-style path
                        command
                    })
                }

                // Check file stats
                const stats = await fs.promises.stat(fullPath)
                if (stats.isDirectory()) {
                    return NextResponse.json({
                        output: `open: ${filePath}: Is a directory, use 'cd' instead`,
                        exitCode: 1,
                        cwd: fsPathToIdePath(currentCwd), // Return IDE-style path
                        command
                    })
                }

                // Determine app to use based on extension
                const ext = path.extname(fullPath).toLowerCase()
                const app = appCommands[ext] || 'notepad' // Default to notepad

                // Execute the command to open file
                const { stdout, stderr } = await execAsync(`start ${app} "${fullPath}"`, {
                    cwd: currentCwd,
                    env: terminalSessions[sessionId].env,
                    timeout: 5000,
                })

                return NextResponse.json({
                    output: `Opening ${filePath} with ${app}...`,
                    exitCode: 0,
                    cwd: fsPathToIdePath(currentCwd), // Return IDE-style path
                    command
                })
            } catch (error: unknown) {
                const execError = error as { stdout?: string; stderr?: string; code?: number }
                return NextResponse.json({
                    output: `Failed to open file: ${(error as Error).message}`,
                    exitCode: execError.code || 1,
                    cwd: fsPathToIdePath(currentCwd), // Return IDE-style path
                    command
                })
            }
        }

        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: currentCwd,
                env: terminalSessions[sessionId].env,
                timeout: 30000, // 30 second timeout
                maxBuffer: 2 * 1024 * 1024 // 2MB buffer
            })

            return NextResponse.json({
                output: stdout + (stderr ? `\nError: ${stderr}` : ''),
                exitCode: 0,
                cwd: fsPathToIdePath(currentCwd), // Return IDE-style path
                command
            })
        } catch (error: unknown) {
            const execError = error as { stdout?: string; stderr?: string; code?: number }
            return NextResponse.json({
                output: (execError.stdout || '') + (execError.stderr ? `\nError: ${execError.stderr}` : ''),
                exitCode: execError.code || 1,
                cwd: fsPathToIdePath(currentCwd), // Return IDE-style path
                command
            })
        }
    } catch (error) {
        console.error('Terminal API error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            output: '',
            exitCode: 1,
            cwd: fsPathToIdePath(terminalSessions['default']?.cwd || PROJECT_ROOT) // Return IDE-style path
        }, { status: 500 })
    }
}
