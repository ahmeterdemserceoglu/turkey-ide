import { NextRequest, NextResponse } from 'next/server'

// GitHub OAuth Constants
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET
const REDIRECT_URI = process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/api/github/callback`
    : 'http://localhost:3000/api/github/callback'

// Handle GitHub OAuth callback
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const code = searchParams.get('code')

        if (!code) {
            return NextResponse.redirect(new URL('http://localhost:3000/?error=github_no_code'))
        }

        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: REDIRECT_URI,
            }),
        })

        const tokenData = await tokenResponse.json()

        if (tokenData.error || !tokenData.access_token) {
            console.error('GitHub token exchange error:', tokenData.error)
            return NextResponse.redirect(new URL('http://localhost:3000/?error=github_token_exchange'))
        }

        // Redirect with token in hash (never sent to server)
        return NextResponse.redirect(new URL(`http://localhost:3000/?github_token=${tokenData.access_token}`))
    } catch (error) {
        console.error('GitHub callback error:', error)
        return NextResponse.redirect(new URL('http://localhost:3000/?error=github_callback'))
    }
} 