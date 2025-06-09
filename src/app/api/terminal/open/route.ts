import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "fs";
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

        // Get the addProjectTerminal function from the store
        const { addProjectTerminal } = useIDEStore.getState();

        // Get project name from path
        const projectName = path.basename(projectPath);

        // Add a terminal for this project
        addProjectTerminal(projectPath, projectName);

        return NextResponse.json({
            success: true,
            message: `Terminal opened for ${projectName}`,
        });

    } catch (error) {
        console.error("Error opening terminal:", error);
        return NextResponse.json(
            { error: "Failed to open terminal" },
            { status: 500 }
        );
    }
} 