import { type NextRequest, NextResponse } from 'next/server'
import { readdir, readFile, writeFile, mkdir, unlink, rmdir, stat, access, rename } from 'node:fs/promises'
import { join, resolve, relative, dirname } from 'node:path'

const PROJECT_ROOT = process.cwd()

interface FileSystemError {
    code?: string
    message: string
}

// Security: Ensure path is within project root
function sanitizePath(requestedPath: string): string {
    const fullPath = resolve(PROJECT_ROOT, requestedPath.replace(/^\//, ''))
    const relativePath = relative(PROJECT_ROOT, fullPath)

    if (relativePath.startsWith('..') || relativePath.includes('..')) {
        throw new Error('Access denied: Path outside project root')
    }

    return fullPath
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const path = searchParams.get('path') || '/'
        const action = searchParams.get('action') || 'list'

        const safePath = sanitizePath(path)

        switch (action) {
            case 'list': {
                const items = await readdir(safePath, { withFileTypes: true })
                const fileList = await Promise.all(
                    items.map(async (item) => {
                        const itemPath = join(safePath, item.name)
                        const stats = await stat(itemPath)
                        return {
                            name: item.name,
                            type: item.isDirectory() ? 'folder' : 'file',
                            path: relative(PROJECT_ROOT, itemPath),
                            size: stats.size,
                            modified: stats.mtime.toISOString()
                        }
                    })
                )

                return NextResponse.json({ files: fileList })
            }

            case 'read': {
                const content = await readFile(safePath, 'utf-8')
                return NextResponse.json({ content })
            }

            case 'stat': {
                const stats = await stat(safePath)
                return NextResponse.json({
                    size: stats.size,
                    modified: stats.mtime.toISOString(),
                    isDirectory: stats.isDirectory(),
                    isFile: stats.isFile()
                })
            }

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }
    } catch (error: unknown) {
        console.error('Filesystem GET error:', error)
        const errorMessage = error instanceof Error ? error.message : 'File operation failed'
        const nodeError = error as { code?: string }
        if (errorMessage.includes('ENOENT') || nodeError.code === 'ENOENT') {
            return NextResponse.json({ error: 'File or directory not found' }, { status: 404 })
        }
        return NextResponse.json({
            error: errorMessage
        }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        // Check if the request is valid
        if (!request.body) {
            return NextResponse.json({ error: 'Request body is empty' }, { status: 400 })
        }

        let requestData: { operation: string; path?: string; content?: string; newName?: string; destination?: string };

        try {
            const body = await request.text();

            // Verify that the body can be parsed
            if (!body || body.trim() === '') {
                return NextResponse.json({ error: 'Request body is empty' }, { status: 400 })
            }

            // Parse the JSON body
            requestData = JSON.parse(body);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return NextResponse.json({
                error: `Failed to parse JSON request: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
            }, { status: 400 })
        }

        const { path, content, action = 'write', newPath } = requestData;

        if (!path) {
            return NextResponse.json({ error: 'Path is required' }, { status: 400 })
        }

        const safePath = path.startsWith('/') ? path.slice(1) : path
        const fullPath = join(process.cwd(), safePath)

        switch (action) {
            case 'write': {
                if (content === undefined) {
                    return NextResponse.json({ error: 'Content is required for write action' }, { status: 400 })
                }

                // Ensure directory exists
                const dir = dirname(fullPath)
                await mkdir(dir, { recursive: true })

                await writeFile(fullPath, content, 'utf8')
                return NextResponse.json({ success: true, message: 'File saved successfully' })
            }

            case 'create-file': {
                // Check if file already exists
                try {
                    await access(fullPath)
                    return NextResponse.json({ error: 'File already exists' }, { status: 409 })
                } catch {
                    // File doesn't exist, which is what we want
                }

                // Ensure directory exists
                const dir = dirname(fullPath)
                await mkdir(dir, { recursive: true })

                await writeFile(fullPath, content || '', 'utf8')
                return NextResponse.json({ success: true, message: 'File created successfully' })
            }

            case 'create-folder': {
                // Check if folder already exists
                try {
                    const stats = await stat(fullPath)
                    if (stats.isDirectory()) {
                        return NextResponse.json({ error: 'Folder already exists' }, { status: 409 })
                    }
                } catch {
                    // Folder doesn't exist, which is what we want
                }

                await mkdir(fullPath, { recursive: true })
                return NextResponse.json({ success: true, message: 'Folder created successfully' })
            }

            case 'rename': {
                if (!newPath) {
                    return NextResponse.json({ error: 'New path is required for rename action' }, { status: 400 })
                }

                const safeNewPath = newPath.startsWith('/') ? newPath.slice(1) : newPath
                const fullNewPath = join(process.cwd(), safeNewPath)

                // Check if source exists
                try {
                    await access(fullPath)
                } catch {
                    return NextResponse.json({ error: 'Source file or folder not found' }, { status: 404 })
                }

                // Check if destination already exists
                try {
                    await access(fullNewPath)
                    return NextResponse.json({ error: 'Destination already exists' }, { status: 409 })
                } catch {
                    // Destination doesn't exist, which is what we want
                }

                // Ensure destination directory exists
                const dir = dirname(fullNewPath)
                await mkdir(dir, { recursive: true })

                await rename(fullPath, fullNewPath)
                return NextResponse.json({ success: true, message: 'Item renamed successfully' })
            }

            case 'delete': {
                try {
                    const stats = await stat(fullPath)
                    if (stats.isDirectory()) {
                        await rmdir(fullPath, { recursive: true })
                    } else {
                        await unlink(fullPath)
                    }
                    return NextResponse.json({ success: true, message: 'Item deleted successfully' })
                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                    const nodeError = error as { code?: string }
                    if (errorMessage.includes('ENOENT') || nodeError.code === 'ENOENT') {
                        return NextResponse.json({ error: 'File or directory not found' }, { status: 404 })
                    }
                    return NextResponse.json({ error: errorMessage }, { status: 500 })
                }
            }

            case 'get-full-path': {
                try {
                    // Convert path to absolute path
                    const fullPath = resolve(PROJECT_ROOT, safePath)

                    // Check if path exists
                    await access(fullPath)

                    // Return the full absolute path
                    return NextResponse.json({
                        success: true,
                        fullPath: fullPath
                    })
                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                    const nodeError = error as { code?: string }
                    if (errorMessage.includes('ENOENT') || nodeError.code === 'ENOENT') {
                        return NextResponse.json({ error: 'Path not found' }, { status: 404 })
                    }
                    return NextResponse.json({ error: errorMessage }, { status: 500 })
                }
            }

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }
    } catch (error: unknown) {
        console.error('Filesystem POST error:', error)
        const errorMessage = error instanceof Error ? error.message : 'File operation failed'
        const nodeError = error as { code?: string }
        if (errorMessage.includes('ENOENT') || nodeError.code === 'ENOENT') {
            return NextResponse.json({ error: 'File or directory not found' }, { status: 404 })
        }
        return NextResponse.json({
            error: errorMessage
        }, { status: 500 })
    }
}
