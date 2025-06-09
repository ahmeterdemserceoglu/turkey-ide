import { NextRequest, NextResponse } from 'next/server'
import {
    detectLanguageFromFilename,
    getAvailableCommands,
    getPackageManagers,
    getAllSupportedLanguages,
    type LanguageInfo,
    type PackageManager
} from '@/lib/language-detector'

interface LanguageDetectionRequest {
    filename: string
}

interface LanguageDetectionResponse {
    language: LanguageInfo | null
    commands: Record<string, string>
    packageManagers: PackageManager[]
}

interface GetLanguagesResponse {
    languages: LanguageInfo[]
}

export async function POST(request: NextRequest) {
    try {
        const body: LanguageDetectionRequest = await request.json()
        const { filename } = body

        if (!filename) {
            return NextResponse.json(
                { error: 'Filename is required' },
                { status: 400 }
            )
        }

        const language = detectLanguageFromFilename(filename)
        const commands = getAvailableCommands(filename)
        const packageManagers = getPackageManagers(filename)

        const response: LanguageDetectionResponse = {
            language,
            commands,
            packageManagers
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Language detection error:', error)
        return NextResponse.json(
            { error: 'Failed to detect language' },
            { status: 500 }
        )
    }
}

export async function GET() {
    try {
        const languages = getAllSupportedLanguages()

        const response: GetLanguagesResponse = {
            languages
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Get languages error:', error)
        return NextResponse.json(
            { error: 'Failed to get supported languages' },
            { status: 500 }
        )
    }
}
