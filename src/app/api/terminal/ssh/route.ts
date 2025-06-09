'use server';

import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'ssh2'

// Store SSH sessions
const sshSessions: Record<string, { client: Client, status: string }> = {}

export async function POST(request: NextRequest) {
    try {
        const { action, sessionId = 'default', host, port, username, password, privateKey, command } = await request.json()

        // Initialize session if it doesn't exist
        if (!sshSessions[sessionId] && action !== 'connect') {
            return NextResponse.json({
                error: 'SSH session not found. Please connect first.',
                status: 'disconnected'
            }, { status: 400 })
        }

        switch (action) {
            case 'connect': {
                // Close existing session if any
                if (sshSessions[sessionId]) {
                    try {
                        sshSessions[sessionId].client.end()
                    } catch (error) {
                        console.error('Error closing existing SSH session:', error)
                    }
                }

                // Create new SSH client
                const client = new Client()

                // Store session with pending status
                sshSessions[sessionId] = {
                    client,
                    status: 'pending'
                }

                try {
                    // Create a promise to handle connection
                    const connectionPromise = new Promise<{ success: boolean, message?: string }>((resolve, reject) => {
                        client
                            .on('ready', () => {
                                sshSessions[sessionId].status = 'connected'
                                resolve({ success: true, message: 'SSH connection established' })
                            })
                            .on('error', (err) => {
                                delete sshSessions[sessionId]
                                reject(err)
                            })
                            .connect({
                                host,
                                port: port || 22,
                                username,
                                password,
                                privateKey,
                                readyTimeout: 10000,
                                // Known hosts checking off for demo
                                algorithms: {
                                    serverHostKey: [
                                        'ssh-rsa',
                                        'ssh-dss',
                                        'ssh-ed25519',
                                        'ecdsa-sha2-nistp256',
                                        'ecdsa-sha2-nistp384',
                                        'ecdsa-sha2-nistp521'
                                    ]
                                }
                            })
                    })

                    // Wait for connection
                    const result = await connectionPromise
                    return NextResponse.json({
                        message: result.message,
                        status: 'connected'
                    })
                } catch (error) {
                    console.error('SSH connection error:', error)
                    return NextResponse.json({
                        error: `SSH connection failed: ${(error as Error).message}`,
                        status: 'disconnected'
                    }, { status: 500 })
                }
            }

            case 'disconnect': {
                if (sshSessions[sessionId]) {
                    try {
                        sshSessions[sessionId].client.end()
                    } finally {
                        delete sshSessions[sessionId]
                    }
                }
                return NextResponse.json({
                    message: 'SSH session disconnected',
                    status: 'disconnected'
                })
            }

            case 'execute': {
                if (!command) {
                    return NextResponse.json({
                        error: 'Command is required',
                        status: sshSessions[sessionId].status
                    }, { status: 400 })
                }

                try {
                    const client = sshSessions[sessionId].client

                    // Create a promise to handle execution
                    const execPromise = new Promise<{ stdout: string, stderr: string, code: number }>((resolve, reject) => {
                        client.exec(command, (err, stream) => {
                            if (err) {
                                reject(err)
                                return
                            }

                            let stdout = ''
                            let stderr = ''

                            stream
                                .on('data', (data: Buffer) => {
                                    stdout += data.toString()
                                })
                                .stderr.on('data', (data: Buffer) => {
                                    stderr += data.toString()
                                })
                                .on('close', (code: number) => {
                                    resolve({ stdout, stderr, code })
                                })
                                .on('error', (err) => {
                                    reject(err)
                                })
                        })
                    })

                    const result = await execPromise
                    return NextResponse.json({
                        output: result.stdout + (result.stderr ? `\nError: ${result.stderr}` : ''),
                        exitCode: result.code,
                        status: sshSessions[sessionId].status
                    })
                } catch (error) {
                    console.error('SSH exec error:', error)
                    return NextResponse.json({
                        error: `SSH exec failed: ${(error as Error).message}`,
                        output: '',
                        exitCode: 1,
                        status: sshSessions[sessionId].status
                    }, { status: 500 })
                }
            }

            case 'status': {
                return NextResponse.json({
                    status: sshSessions[sessionId]?.status || 'disconnected'
                })
            }

            default:
                return NextResponse.json({
                    error: 'Invalid action',
                    status: sshSessions[sessionId]?.status || 'disconnected'
                }, { status: 400 })
        }
    } catch (error) {
        console.error('SSH API error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            status: 'error'
        }, { status: 500 })
    }
} 