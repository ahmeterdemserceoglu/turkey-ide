import { type NextRequest, NextResponse } from 'next/server'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
    try {
        const { command, workingDirectory = process.cwd() } = await request.json()

        if (!command) {
            return NextResponse.json({ error: 'Command is required' }, { status: 400 })
        }

        // Security: Only allow certain safe commands
        const allowedCommands = [
            'ls', 'dir', 'pwd', 'cd', 'mkdir', 'touch', 'cat', 'echo',
            'git status', 'git log --oneline -5', 'git branch', 'git diff --name-only',
            'npm list --depth=0', 'npm outdated', 'node --version', 'npm --version',
            'which', 'whoami', 'date', 'uptime', 'df -h', 'free -h'
        ]

        const isAllowed = allowedCommands.some(allowed =>
            command.toLowerCase().startsWith(allowed.toLowerCase())
        )

        if (!isAllowed) {
            return NextResponse.json({
                error: 'Command not allowed for security reasons',
                allowedCommands
            }, { status: 403 })
        }

        // Ensure working directory is safe
        const safePath = path.resolve(workingDirectory)

        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: safePath,
                timeout: 10000, // 10 second timeout
                maxBuffer: 1024 * 1024 // 1MB buffer
            })

            return NextResponse.json({
                success: true,
                output: stdout,
                error: stderr,
                command,
                workingDirectory: safePath
            })

        } catch (execError: unknown) {
            return NextResponse.json({
                success: false,
                output: '',
                error: execError instanceof Error ? execError.message : 'Unknown error',
                command,
                workingDirectory: safePath
            })
        }

    } catch (error) {
        console.error('AI Command API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'TurkeyIDE AI Command API',
        status: 'active',
        allowedCommands: [
            'ls', 'dir', 'pwd', 'cd', 'mkdir', 'touch', 'cat', 'echo',
            'git status', 'git log --oneline -5', 'git branch', 'git diff --name-only',
            'npm list --depth=0', 'npm outdated', 'node --version', 'npm --version',
            'which', 'whoami', 'date', 'uptime', 'df -h', 'free -h'
        ]
    })
}
