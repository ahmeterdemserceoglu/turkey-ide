import { GoogleGenerativeAI, type Content, type Part } from "@google/generative-ai";
import { useAIStore } from "@/store/ai-store";

export type AIProvider = "gemini";

export interface AIMessage {
    role: "user" | "assistant" | "system";
    content: string;
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
}

export interface ToolCall {
    id: string;
    name: string;
    parameters: any;
}

export interface ToolResult {
    toolCallId: string;
    result: any;
    error?: string;
}

export interface AIConfig {
    google?: {
        apiKey: string;
    };
}

export interface ProjectContext {
    currentFile?: string;
    workingDirectory?: string;
    openTabs?: string[];
    fileTree?: any;
    agentMode?: boolean;
}

export class AIService {
    private google?: GoogleGenerativeAI;
    private config: AIConfig;

    constructor(config: AIConfig) {
        this.config = config;
        this.initializeClients();
    }

    private initializeClients(): void {
        if (this.config.google?.apiKey) {
            console.log("Initializing Google Generative AI with key");
            this.google = new GoogleGenerativeAI(this.config.google.apiKey);
        } else {
            console.warn("No Google API key provided");
        }
    }

    async chat(
        messages: AIMessage[],
        options?: {
            temperature?: number;
            maxTokens?: number;
            tools?: any[];
            systemPrompt?: string;
            projectContext?: ProjectContext;
        },
    ): Promise<AIMessage> {
        const systemPrompt = options?.systemPrompt || this.getDefaultSystemPrompt(options?.projectContext);

        // Only use Gemini for now
        return await this.chatWithGemini(messages, systemPrompt, options);
    }

    private async chatWithGemini(
        messages: AIMessage[],
        systemPrompt: string,
        options?: any,
    ): Promise<AIMessage> {
        if (!this.google) {
            console.error("Google AI client not initialized - missing API key");
            throw new Error("Google AI client not initialized - missing API key");
        }

        try {
            console.log("Starting chat with Gemini...");

            // Get the Gemini model
            const model = this.google.getGenerativeModel({
                model: "gemini-1.5-flash",
            });

            // Format the messages for Gemini
            const formattedMessages: Content[] = [
                { role: "user", parts: [{ text: systemPrompt }] },
                ...messages.map((msg) => ({
                    role: msg.role === "assistant" ? "model" : "user",
                    parts: [{ text: msg.content }],
                })),
            ];

            console.log("Sending request to Gemini with messages:", JSON.stringify(formattedMessages).substring(0, 200) + "...");

            // Generate content
            const result = await model.generateContent({
                contents: formattedMessages,
                generationConfig: {
                    temperature: options?.temperature || 0.7,
                    maxOutputTokens: options?.maxTokens || 2048,
                    topK: 40,
                    topP: 0.95,
                },
            });

            console.log("Received response from Gemini model");

            // Extract the response
            const response = result.response;
            const content = response.text();

            console.log("Response text length:", content.length);

            return {
                role: "assistant",
                content,
            };
        } catch (error) {
            console.error("Error in chatWithGemini:", error);
            throw error;
        }
    }

    private getDefaultSystemPrompt(context?: ProjectContext): string {
        let prompt = `Sen TurkeyIDE'nin yapay zeka asistanısın. Kullanıcıların kodlama, debugging, dosya yönetimi ve proje geliştirme konularında yardım ediyorsun. 
Türkçe olarak cevap ver ve açık, faydalı yanıtlar ver.`;

        // Add agent mode information if provided
        if (context?.agentMode) {
            prompt += `\nŞu anda Agent Modunda çalışıyorsun. Bu modda, dosya işlemlerini otomatik olarak gerçekleştirmeye yetkin var. Kullanıcı için proaktif olmalı ve en faydalı çözümleri sunmalısın.`;
        }

        prompt += `\n\nYapabileceklerin arasında şunlar var:
1. Kod analizi ve hata ayıklama
2. Yeni dosya oluşturma için kod önerileri
3. Mevcut dosyalarda değişiklik önerileri
4. Terminal komutları önerme ve açıklama
5. Proje yapılandırma ve mimari öneriler

Eğer bir dosya oluşturmak veya düzenlemek gerekiyorsa, aşağıdaki formatta cevap ver:
\`\`\`dosya-işlemi
işlem: [create/edit]
dosya-yolu: [dosyanın tam yolu]
içerik:
[dosya içeriği buraya]
\`\`\`

Birden fazla dosya için bu bloğu tekrarlayabilirsin.`;

        return prompt;
    }
}

// Create a singleton instance for client-side use
export const createAIService = () => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
        console.warn("NEXT_PUBLIC_GEMINI_API_KEY is not set");
        return null;
    }

    return new AIService({
        google: { apiKey }
    });
};

// Helper hook to use the AI service with the current provider
export const useAI = () => {
    const { provider } = useAIStore();
    const aiService = createAIService();

    const sendMessage = async (
        messages: AIMessage[],
        options?: {
            temperature?: number;
            maxTokens?: number;
            systemPrompt?: string;
            projectContext?: ProjectContext;
        }
    ) => {
        if (!aiService) {
            throw new Error("AI service not initialized - check your API key");
        }

        try {
            return await aiService.chat(messages, options);
        } catch (error) {
            console.error("Error in AI service:", error);
            throw error;
        }
    };

    return {
        provider,
        sendMessage,
    };
};
