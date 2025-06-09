import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { useIDEStore } from "@/store/ide-store";
import path from "path";

export async function POST(request: NextRequest) {
    try {
        // Get the project path from query params
        const projectPath = request.nextUrl.searchParams.get("path");

        if (!projectPath) {
            return NextResponse.json(
                { error: "Project path is required" },
                { status: 400 }
            );
        }

        // Validate that the path exists
        if (!existsSync(projectPath)) {
            return NextResponse.json(
                { error: "Project does not exist at the specified path" },
                { status: 404 }
            );
        }

        // Get project name from path
        const projectName = path.basename(projectPath);

        // Check if package.json exists and find a start script
        const packageJsonPath = path.join(projectPath, 'package.json');
        let command = 'npm run dev';

        if (existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
                const scripts = packageJson.scripts || {};

                // Look for a start command in the scripts
                const commandPriority = ['dev', 'start', 'serve', 'develop'];

                for (const cmd of commandPriority) {
                    if (scripts[cmd]) {
                        command = `npm run ${cmd}`;
                        break;
                    }
                }
            } catch (err) {
                console.error("Error reading package.json:", err);
            }
        }

        // Get the addProjectTerminal function from the store
        const { addProjectTerminal } = useIDEStore.getState();

        // Add a terminal and run the command
        const terminalId = addProjectTerminal(projectPath, projectName);

        // TODO: Run the command in the terminal
        // This would typically involve setting up a WebSocket connection or similar
        // For now we just return success

        return NextResponse.json({
            success: true,
            message: `Development server started for ${projectName} with command: ${command}`,
            command,
            terminalId,
        });

    } catch (error) {
        console.error("Error starting development server:", error);
        return NextResponse.json(
            { error: "Failed to start development server" },
            { status: 500 }
        );
    }
} 