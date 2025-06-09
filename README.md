This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, set up your environment variables:

1. Create a `.env.local` file in the root directory
2. Add the following environment variables:
```
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```
3. Replace `your_gemini_api_key_here` with your actual Gemini API key. You can get one from [Google AI Studio](https://makersuite.google.com/app/apikey).

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## AI Features

This project includes an AI assistant powered by Google's Gemini API. Key features include:

- **Real-time streaming responses** for a more interactive experience
- **Agent Mode** that can automatically create and edit files based on AI suggestions
- **Multiple chat sessions** with localStorage persistence
- **File operations** for creating and editing code files directly from the AI interface
- **Context-aware responses** that understand your project structure and current files
- **AI Settings page** at `/ai-settings` for managing providers and sessions
- **Test page** at `/ai-test` for testing AI features

Currently, only Gemini is supported as the AI provider, but the architecture is designed to easily add more providers in the future.

### Using the AI Assistant

1. Click on the AI icon in the sidebar or navigate to `/ai-test`
2. Toggle Agent Mode on if you want the AI to automatically apply file changes
3. Ask questions about coding, project structure, or request the AI to create/edit files
4. Use the file operation buttons to apply or view suggested changes
5. Manage your chat history and sessions in the settings dropdown

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
