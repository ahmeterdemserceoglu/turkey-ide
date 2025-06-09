"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Send,
    Bot,
    User,
    Loader2,
    Settings,
    Terminal,
    Code,
    FileText,
    GitBranch,
    Database,
    Zap,
    Brain,
    Search,
    Shield,
    Gauge,
    type LucideIcon,
    CheckCircle,
    AlertCircle,
    Clock,
    Play,
    Pause,
    Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useIDEStore } from "@/store/ide-store";
import { useToast } from "@/components/ui/use-toast";

type AIModel = "gemini-2.0-flash";
type AgentMode = "chat" | "autonomous" | "pair-programming";
type MCPServerStatus = "connected" | "disconnected" | "error";

interface Message {
    id: string;
    content: string;
    role: "user" | "assistant" | "system";
    timestamp: Date;
    model?: AIModel;
    agentActions?: AgentAction[];
    codeChanges?: CodeChange[];
    mcpResults?: MCPResult[];
}

interface AgentAction {
    id: string;
    title: string;
    description: string;
    status: "pending" | "running" | "completed" | "error";
    progress?: number;
    result?: string;
}

interface CodeChange {
    file: string;
    action: "create" | "modify" | "delete";
    content?: string;
    diff?: string;
    applied: boolean;
}

interface MCPResult {
    server: string;
    tool: string;
    result: any;
    status: "success" | "error";
}

interface MCPServer {
    id: string;
    name: string;
    type: "database" | "filesystem" | "github" | "terminal" | "custom";
    status: MCPServerStatus;
    tools: string[];
}

const AI_MODELS: Record<
    AIModel,
    { name: string; icon: string; description: string }
> = {
    "gpt-4o": {
        name: "GPT-4o",
        icon: "🚀",
        description: "OpenAI's most advanced model",
    },
    "claude-3.5-sonnet": {
        name: "Claude 3.5 Sonnet",
        icon: "🧠",
        description: "Anthropic's reasoning expert",
    },
    "gemini-2.0-flash": {
        name: "Gemini 2.0 Flash",
        icon: "⚡",
        description: "Google's fastest model",
    },
};

const AGENT_MODES: Record<
    AgentMode,
    { name: string; icon: LucideIcon; description: string }
> = {
    chat: {
        name: "Chat Mode",
        icon: Bot,
        description: "Interactive conversation",
    },
    autonomous: {
        name: "Agent Mode",
        icon: Zap,
        description: "Autonomous task execution",
    },
    "pair-programming": {
        name: "Pair Programming",
        icon: Code,
        description: "Collaborative coding",
    },
};

export function AdvancedAIAssistant() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedModel, setSelectedModel] =
        useState<AIModel>("claude-3.5-sonnet");
    const [agentMode, setAgentMode] = useState<AgentMode>("chat");
    const [isAgentRunning, setIsAgentRunning] = useState(false);
    const [mcpServers, setMcpServers] = useState<MCPServer[]>([
        {
            id: "db",
            name: "Database",
            type: "database",
            status: "connected",
            tools: ["query", "schema", "migrate"],
        },
        {
            id: "fs",
            name: "File System",
            type: "filesystem",
            status: "connected",
            tools: ["read", "write", "search"],
        },
        {
            id: "git",
            name: "GitHub",
            type: "github",
            status: "connected",
            tools: ["commit", "push", "pr"],
        },
        {
            id: "term",
            name: "Terminal",
            type: "terminal",
            status: "connected",
            tools: ["exec", "install", "build"],
        },
    ]);
    const [currentTask, setCurrentTask] = useState<string>("");
    const [taskProgress, setTaskProgress] = useState(0);

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // Auto scroll to bottom
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollElement = scrollAreaRef.current.querySelector(
                "[data-radix-scroll-area-viewport]",
            );
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    }, [messages]);

    const sendMessage = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            content: input,
            role: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // Simulate AI response with agent actions
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const assistantMessage: Message = {
                id: crypto.randomUUID(),
                content: `I'll help you with that using ${AI_MODELS[selectedModel].name}. Let me analyze your request and execute the necessary actions.`,
                role: "assistant",
                timestamp: new Date(),
                model: selectedModel,
                agentActions:
                    agentMode === "autonomous"
                        ? [
                            {
                                id: "analyze",
                                title: "Analyzing project structure",
                                description: "Scanning files and dependencies",
                                status: "completed",
                                progress: 100,
                                result: "Found 156 files, 23 components, 12 API routes",
                            },
                            {
                                id: "suggest",
                                title: "Generating suggestions",
                                description: "Creating optimization recommendations",
                                status: "running",
                                progress: 60,
                            },
                        ]
                        : undefined,
            };

            setMessages((prev) => [...prev, assistantMessage]);

            toast({
                title: "Message sent",
                description: `Using ${AI_MODELS[selectedModel].name} in ${AGENT_MODES[agentMode].name}`,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to send message",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, selectedModel, agentMode, toast]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const toggleAgent = () => {
        setIsAgentRunning(!isAgentRunning);
        if (!isAgentRunning) {
            setCurrentTask("Analyzing codebase...");
            setTaskProgress(0);
            // Simulate agent work
            const interval = setInterval(() => {
                setTaskProgress((prev) => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setIsAgentRunning(false);
                        setCurrentTask("");
                        return 100;
                    }
                    return prev + 10;
                });
            }, 500);
        }
    };

    const renderMessage = (message: Message) => (
        <div key={message.id} className="mb-4">
            <div
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
                {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4" />
                    </div>
                )}

                <div
                    className={`max-w-[70%] ${message.role === "user" ? "order-first" : ""}`}
                >
                    <div
                        className={`p-3 rounded-lg ${message.role === "user"
                            ? "bg-primary text-primary-foreground ml-auto"
                            : "bg-muted"
                            }`}
                    >
                        <p className="text-sm">{message.content}</p>
                        {message.model && (
                            <Badge variant="outline" className="mt-2 text-xs">
                                {AI_MODELS[message.model].icon} {AI_MODELS[message.model].name}
                            </Badge>
                        )}
                    </div>

                    {/* Agent Actions */}
                    {message.agentActions && (
                        <div className="mt-3 space-y-2">
                            {message.agentActions.map((action) => (
                                <Card key={action.id} className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-medium">{action.title}</h4>
                                        <Badge
                                            variant={
                                                action.status === "completed"
                                                    ? "default"
                                                    : action.status === "running"
                                                        ? "secondary"
                                                        : action.status === "error"
                                                            ? "destructive"
                                                            : "outline"
                                            }
                                        >
                                            {action.status === "completed" && (
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                            )}
                                            {action.status === "running" && (
                                                <Clock className="w-3 h-3 mr-1" />
                                            )}
                                            {action.status === "error" && (
                                                <AlertCircle className="w-3 h-3 mr-1" />
                                            )}
                                            {action.status}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        {action.description}
                                    </p>
                                    {action.progress !== undefined && (
                                        <Progress value={action.progress} className="mb-2" />
                                    )}
                                    {action.result && (
                                        <p className="text-xs bg-muted p-2 rounded">
                                            {action.result}
                                        </p>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {message.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <User className="w-4 h-4" />
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">AI Coding Assistant</h2>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={toggleAgent}
                            variant={isAgentRunning ? "destructive" : "default"}
                            size="sm"
                        >
                            {isAgentRunning ? (
                                <Pause className="w-4 h-4 mr-2" />
                            ) : (
                                <Play className="w-4 h-4 mr-2" />
                            )}
                            {isAgentRunning ? "Pause Agent" : "Start Agent"}
                        </Button>
                        <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Model and Mode Selection */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block">AI Model</label>
                        <Select
                            value={selectedModel}
                            onValueChange={(value: AIModel) => setSelectedModel(value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(AI_MODELS).map(([key, model]) => (
                                    <SelectItem key={key} value={key}>
                                        <div className="flex items-center gap-2">
                                            <span>{model.icon}</span>
                                            <span>{model.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-2 block">Mode</label>
                        <Select
                            value={agentMode}
                            onValueChange={(value: AgentMode) => setAgentMode(value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(AGENT_MODES).map(([key, mode]) => (
                                    <SelectItem key={key} value={key}>
                                        <div className="flex items-center gap-2">
                                            <mode.icon className="w-4 h-4" />
                                            <span>{mode.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Agent Status */}
                {isAgentRunning && (
                    <Card className="p-3 bg-primary/5">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-sm font-medium">Agent Running</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{currentTask}</p>
                        <Progress value={taskProgress} />
                    </Card>
                )}

                {/* MCP Servers */}
                <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">MCP Servers</h3>
                    <div className="flex gap-2 flex-wrap">
                        {mcpServers.map((server) => (
                            <Badge
                                key={server.id}
                                variant={
                                    server.status === "connected" ? "default" : "destructive"
                                }
                                className="text-xs"
                            >
                                <div
                                    className={`w-2 h-2 rounded-full mr-1 ${server.status === "connected"
                                        ? "bg-green-500"
                                        : "bg-red-500"
                                        }`}
                                />
                                {server.name}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <h3 className="font-medium mb-2">Welcome to AI Coding Assistant</h3>
                        <p className="text-sm">
                            Start a conversation or let the agent analyze your project
                            autonomously.
                        </p>
                    </div>
                ) : (
                    messages.map(renderMessage)
                )}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">AI is thinking...</span>
                        </div>
                    </div>
                )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t">
                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask anything about your code, or describe what you want to build..."
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        size="sm"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-4 mt-2">
                    <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                            <Code className="w-3 h-3 mr-1" />
                            <span className="text-xs">Code</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                            <Database className="w-3 h-3 mr-1" />
                            <span className="text-xs">Database</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                            <Terminal className="w-3 h-3 mr-1" />
                            <span className="text-xs">Terminal</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                            <GitBranch className="w-3 h-3 mr-1" />
                            <span className="text-xs">Git</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
