import { type NextRequest, NextResponse } from 'next/server'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
    try {
        // Check if the request is valid
        if (!request.body) {
            return NextResponse.json({ error: 'Request body is empty' }, { status: 400 })
        }

        // Get the request body as text first to diagnose any JSON issues
        let content: string;
        let language: string;
        let filename: string;

        try {
            const body = await request.text();

            // Verify that the body can be parsed
            if (!body || body.trim() === '') {
                return NextResponse.json({ error: 'Request body is empty' }, { status: 400 })
            }

            // Parse the JSON body
            const data = JSON.parse(body);
            content = data.content;
            language = data.language;
            filename = data.filename;
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return NextResponse.json({
                error: `Failed to parse JSON request: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
            }, { status: 400 })
        }

        if (!content || !filename) {
            return NextResponse.json({ error: 'Content and filename are required' }, { status: 400 })
        }

        // Create a temporary file using os.tmpdir() for platform independence
        const tempDir = path.join(os.tmpdir(), 'turkish-ide-lint')
        const tempFile = path.join(tempDir, filename)

        try {
            await fs.mkdir(tempDir, { recursive: true })
            await fs.writeFile(tempFile, content, 'utf8')

            // Run Biome linter
            const { stdout, stderr } = await execAsync(`npx biome lint --reporter=json "${tempFile}"`)

            interface LintIssue {
                line: number;
                column: number;
                message: string;
                severity: 'error' | 'warning';
                rule: string;
            }

            let issues: LintIssue[] = []

            if (stdout) {
                try {
                    const result = JSON.parse(stdout)
                    if (result.diagnostics) {
                        interface BiomeDiagnostic {
                            location?: {
                                start?: {
                                    line?: number;
                                    column?: number;
                                }
                            };
                            description?: string;
                            severity?: string;
                            category?: string;
                        }

                        issues = result.diagnostics.map((diagnostic: BiomeDiagnostic) => ({
                            line: diagnostic.location?.start?.line || 1,
                            column: diagnostic.location?.start?.column || 1,
                            message: diagnostic.description || 'Linting issue',
                            severity: diagnostic.severity === 'error' ? 'error' : 'warning',
                            rule: diagnostic.category || 'unknown'
                        }))
                    }
                } catch (parseError) {
                    console.error('Failed to parse Biome output:', parseError)
                }
            }

            // Clean up temp file
            try {
                await fs.unlink(tempFile)
            } catch (cleanupError) {
                console.error('Failed to cleanup temp file:', cleanupError)
            }

            return NextResponse.json({
                success: true,
                issues,
                language,
                filename
            })

        } catch (lintError) {
            console.error('Linting error:', lintError)

            // Clean up temp file in case of error
            try {
                await fs.unlink(tempFile)
            } catch (cleanupError) {
                // Ignore cleanup errors
            }

            // If Biome is not available, return empty issues
            return NextResponse.json({
                success: true,
                issues: [],
                language,
                filename,
                message: 'Linter not available'
            })
        }

    } catch (error: unknown) {
        console.error('Linter API error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Linting failed'
        return NextResponse.json({
            error: errorMessage,
            success: false
        }, { status: 500 })
    }
}
