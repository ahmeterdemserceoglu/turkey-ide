import { type NextRequest, NextResponse } from "next/server";
import { AIService, type AIModel, type AgentMode } from "@/lib/ai/ai-service";
import {
    MCPServerManager,
    DatabaseMCPServer,
    FileSystemMCPServer,
    GitHubMCPServer,
    TerminalMCPServer,
} from "@/lib/mcp/mcp-server";

// Global instances (in production, use proper dependency injection)
let aiService: AIService | null = null;
let mcpManager: MCPServerManager | null = null;

// Initialize services
async function initializeServices() {
    if (!aiService) {
        aiService = new AIService({
            openai: {
                apiKey: process.env.OPENAI_API_KEY || "",
            },
            anthropic: {
                apiKey: process.env.ANTHROPIC_API_KEY || "",
            },
            google: {
                apiKey: process.env.GOOGLE_API_KEY || "",
            },
        });
    }

    if (!mcpManager) {
        mcpManager = new MCPServerManager();

        // Add MCP servers
        await mcpManager.addServer(
            new DatabaseMCPServer(process.env.DATABASE_URL || ""),
        );
        await mcpManager.addServer(new FileSystemMCPServer());
        await mcpManager.addServer(
            new GitHubMCPServer(process.env.GITHUB_TOKEN || ""),
        );
        await mcpManager.addServer(new TerminalMCPServer());
    }

    return { aiService, mcpManager };
}

export async function POST(request: NextRequest) {
    try {
        const { aiService, mcpManager } = await initializeServices();

        const body = await request.json();
        const {
            messages,
            model = "claude-3.5-sonnet",
            mode = "chat",
            options = {},
            mcpTools = false,
            projectContext,
        } = body;

        // Validate required fields
        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: "Messages array is required" },
                { status: 400 },
            );
        }

        // Enhanced system prompt with MCP context
        const systemPrompt = createEnhancedSystemPrompt(mode, mcpTools, mcpManager);

        // Process message with AI service
        const response = await aiService.chat(model as AIModel, messages, {
            ...options,
            systemPrompt,
            tools: mcpTools ? getMCPTools(mcpManager) : undefined,
        });

        // Handle tool calls if present
        if (response.toolCalls && mcpTools) {
            const toolResults = await Promise.all(
                response.toolCalls.map(async (toolCall) => {
                    try {
                        const [serverId, toolName] = toolCall.name.split(".");
                        const result = await mcpManager.executeOnServer(
                            serverId,
                            toolName,
                            toolCall.parameters,
                        );
                        return {
                            toolCallId: toolCall.id,
                            result,
                        };
                    } catch (error) {
                        return {
                            toolCallId: toolCall.id,
                            result: null,
                            error: (error as Error).message,
                        };
                    }
                }),
            );

            response.toolResults = toolResults;
        }

        // Agent mode processing
        if (mode === "autonomous" && projectContext) {
            const agent = await aiService.createAgent(
                "autonomous",
                messages[messages.length - 1].content,
                projectContext,
            );

            // Start agent in background (in production, use proper task queue)
            agent.start().catch(console.error);

            response.agentActions = agent.getActions();
        }

        return NextResponse.json({
            message: response,
            mcpServers: mcpManager.getAllServers().map((server) => ({
                id: server.id,
                name: server.name,
                status: server.status,
                tools: server.tools.length,
            })),
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("AI Chat API Error:", error);
        return NextResponse.json(
            {
                error: "Internal server error",
                message: (error as Error).message,
            },
            { status: 500 },
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { mcpManager } = await initializeServices();

        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        switch (action) {
            case "status":
                return NextResponse.json({
                    status: "operational",
                    models: ["gpt-4o", "claude-3.5-sonnet", "gemini-2.0-flash"],
                    mcpServers: mcpManager.getAllServers().map((server) => ({
                        id: server.id,
                        name: server.name,
                        status: server.status,
                        tools: server.tools.map((tool) => tool.name),
                    })),
                    capabilities: [
                        "multi-model-chat",
                        "autonomous-agents",
                        "mcp-integration",
                        "code-analysis",
                        "project-optimization",
                    ],
                });

            case "tools":
                return NextResponse.json({
                    tools: mcpManager.getAvailableTools(),
                });

            default:
                return NextResponse.json(
                    { error: "Invalid action parameter" },
                    { status: 400 },
                );
        }
    } catch (error) {
        console.error("AI Chat API GET Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

function createEnhancedSystemPrompt(
    mode: AgentMode,
    mcpTools: boolean,
    mcpManager: MCPServerManager,
): string {
    let prompt = `You are an advanced AI coding assistant with the following capabilities:

## Core Abilities
- Multi-language code analysis and generation
- Architecture design and optimization
- Debugging and problem-solving
- Security and performance assessment
- Test generation and quality assurance

## Current Mode: ${mode.toUpperCase()}
${getModeDescription(mode)}

## Guidelines
- Provide clear, actionable solutions
- Consider security and performance implications
- Follow best practices and modern conventions
- Explain your reasoning when helpful
- Ask clarifying questions when needed`;

    if (mcpTools) {
        const servers = mcpManager.getAllServers();
        prompt += `

## Available MCP Tools
You have access to the following integrated tools:
${servers
                .map(
                    (server) => `
### ${server.name} (${server.id})
${server.tools.map((tool) => `- ${tool.name}: ${tool.description}`).join("\n")}
`,
                )
                .join("\n")}

Use these tools when appropriate to:
- Access file systems and databases
- Execute terminal commands
- Manage Git repositories
- Analyze project structures
- Perform automated tasks

Call tools using the format: serverID.toolName with appropriate parameters.`;
    }

    return prompt;
}

function getModeDescription(mode: AgentMode): string {
    switch (mode) {
        case "chat":
            return `Interactive conversation mode. Respond to user queries with helpful explanations and code examples.`;
        case "autonomous":
            return `Autonomous agent mode. Analyze requirements, create execution plans, and perform tasks independently.`;
        case "pair-programming":
            return `Collaborative coding mode. Work alongside the developer, suggesting improvements and catching issues in real-time.`;
        default:
            return "Standard assistance mode.";
    }
}

function getMCPTools(mcpManager: MCPServerManager): any[] {
    const tools = mcpManager.getAvailableTools();

    return tools.flatMap(({ serverId, tools }) =>
        tools.map((tool) => ({
            type: "function",
            function: {
                name: `${serverId}.${tool.name}`,
                description: `${tool.description} (via ${serverId} server)`,
                parameters: {
                    type: "object",
                    properties: tool.parameters,
                    required: Object.keys(tool.parameters).filter(
                        (key) => !tool.parameters[key].default,
                    ),
                },
            },
        })),
    );
}

// Project analysis endpoint
export async function PUT(request: NextRequest) {
    try {
        const { aiService } = await initializeServices();

        const body = await request.json();
        const { projectContext, analysisType = "full" } = body;

        if (!projectContext) {
            return NextResponse.json(
                { error: "Project context is required" },
                { status: 400 },
            );
        }

        const analysis = await aiService.analyzeProject(projectContext);

        return NextResponse.json({
            analysis,
            timestamp: new Date().toISOString(),
            analysisType,
        });
    } catch (error) {
        console.error("Project Analysis API Error:", error);
        return NextResponse.json(
            { error: "Analysis failed", message: (error as Error).message },
            { status: 500 },
        );
    }
}

// Code generation endpoint
export async function PATCH(request: NextRequest) {
    try {
        const { aiService } = await initializeServices();

        const body = await request.json();
        const { request: codeRequest } = body;

        if (!codeRequest) {
            return NextResponse.json(
                { error: "Code generation request is required" },
                { status: 400 },
            );
        }

        const result = await aiService.generateCode(codeRequest);

        return NextResponse.json({
            result,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Code Generation API Error:", error);
        return NextResponse.json(
            { error: "Code generation failed", message: (error as Error).message },
            { status: 500 },
        );
    }
}
