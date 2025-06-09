import { NextRequest, NextResponse } from 'next/server'

// GitHub OAuth Constants
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET
const REDIRECT_URI = process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/api/github/callback`
    : 'http://localhost:3000/api/github/callback'

// Initiate GitHub OAuth flow
export async function GET(request: NextRequest) {
    try {
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo,user`
        return NextResponse.json({ authUrl }, { status: 200 })
    } catch (error) {
        console.error('GitHub auth initiation error:', error)
        return NextResponse.json({ error: 'Failed to initiate GitHub authentication' }, { status: 500 })
    }
} 