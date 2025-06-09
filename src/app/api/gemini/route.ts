import { type NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

// API anahtarını doğrudan kontrol edelim
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
console.log("API key configured:", GEMINI_API_KEY ? "API key is set" : "API key is NOT set")

// Güncel ve çalışan model - Gemini 1.5 Flash
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent'

async function getFileContent(filePath: string): Promise<string | null> {
    try {
        if (!filePath) return null;

        // Dosya yolu slash ile başlıyorsa başındaki slash'ı kaldır
        const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;

        // Projenin ana dizininden itibaren dosyayı oku
        const fullPath = path.join(process.cwd(), normalizedPath);
        const content = await fs.readFile(fullPath, 'utf-8');
        return content;
    } catch (error) {
        console.error(`Dosya okunamadı: ${filePath}`, error);
        return null;
    }
}

export async function POST(request: NextRequest) {
    console.log("Gemini API endpoint triggered");

    try {
        if (!GEMINI_API_KEY) {
            console.error('Gemini API key not configured');
            return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
        }

        const requestData = await request.json();
        console.log("Request data received:", JSON.stringify(requestData).substring(0, 100) + "...");

        const { message, history = [], context = {}, stream = false } = requestData;

        if (!message) {
            console.error("No message provided in request");
            return NextResponse.json({ error: 'Message is required' }, { status: 400 })
        }

        console.log('Sending request to Gemini API with message:', `${message.substring(0, 50)}...`);
        console.log('Context:', JSON.stringify(context).substring(0, 100) + "...");
        console.log('Streaming mode:', stream ? 'enabled' : 'disabled');

        // Create prompt with context if available
        let prompt = `Sen TurkeyIDE'nin yapay zeka asistanısın. Kullanıcıların kodlama, debugging, dosya yönetimi ve proje geliştirme konularında yardım ediyorsun. 
Türkçe olarak cevap ver ve açık, faydalı yanıtlar ver. Agent modundayken kullanıcıya yardımcı olmak için proaktif davranmalısın.

Yapabileceklerin arasında şunlar var:
1. Kod analizi ve hata ayıklama
2. Yeni dosya oluşturma için kod önerileri
3. Mevcut dosyalarda değişiklik önerileri
4. Terminal komutları önerme ve açıklama
5. Proje yapılandırma ve mimari öneriler

Eğer bir dosya oluşturmak veya düzenlemek gerekiyorsa, MUTLAKA aşağıdaki formatta cevap ver:
\`\`\`dosya-işlemi
işlem: [create/edit]
dosya-yolu: [dosyanın tam yolu]
içerik:
[dosya içeriği buraya]
\`\`\`

Birden fazla dosya için bu bloğu tekrarlayabilirsin. Kod yazmak için bu formatı MUTLAKA kullanmalısın.`;

        // Mevcut dosya içeriğini al (varsa)
        let currentFileContent = null;
        if (context.currentFile) {
            currentFileContent = await getFileContent(context.currentFile);
            if (currentFileContent) {
                prompt += `\n\nŞu anda düzenlenen dosya: "${context.currentFile}"\nDosya içeriği:\n\`\`\`\n${currentFileContent}\n\`\`\``;
            } else {
                prompt += `\nKullanıcı şu anda "${context.currentFile}" dosyasını düzenliyor, ancak içeriği okunamadı.`;
            }
        }

        // Diğer bağlam bilgilerini ekle
        if (context.workingDirectory) {
            prompt += `\nTerminalin çalışma dizini: ${context.workingDirectory}`;
        }

        if (context.openTabs && context.openTabs.length > 0) {
            prompt += `\nAçık dosya sekmeleri: ${context.openTabs.join(', ')}`;

            // Açık sekmelerin içeriğini de al (en fazla 3 tane)
            const tabContents = await Promise.all(
                context.openTabs.slice(0, 3).map(async (tab: string) => {
                    if (tab === context.currentFile) return null; // Zaten mevcut dosyayı ekledik
                    const content = await getFileContent(tab);
                    if (content) {
                        return `Sekme: "${tab}"\nİçerik:\n\`\`\`\n${content.substring(0, 1000)}\n...(devamı varsa kısaltıldı)\n\`\`\``;
                    }
                    return null;
                })
            );

            const validTabContents = tabContents.filter(content => content !== null);
            if (validTabContents.length > 0) {
                prompt += `\n\nAçık sekmelerin içeriği:\n${validTabContents.join('\n\n')}`;
            }
        }

        // Add the user's message
        prompt += `\n\nKullanıcının sorusu: ${message}`;

        // Add history context if available
        if (history && history.length > 0) {
            prompt += "\n\nÖnceki konuşma:\n";
            history.forEach((msg: any) => {
                prompt += `${msg.role === 'user' ? 'Kullanıcı' : 'Asistan'}: ${msg.content}\n`;
            });
        }

        try {
            console.log("Sending request to Gemini API URL:", GEMINI_API_URL);
            const requestBody = {
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 4096,
                },
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HARASSMENT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_HATE_SPEECH',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    }
                ]
            };

            console.log("Request body:", JSON.stringify(requestBody).substring(0, 200) + "...");

            if (stream) {
                // Stream yanıtı doğrudan client'a ilet
                const streamUrl = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
                const response = await fetch(streamUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Gemini API streaming error:', response.status, errorText);
                    return NextResponse.json({
                        error: `Gemini API streaming error: ${response.status} - ${errorText}`
                    }, { status: response.status });
                }

                // Stream yanıtını doğrudan client'a ilet
                return new Response(response.body, {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                    },
                });
            } else {
                // Standart (non-streaming) yanıt için generateContent endpointini kullan
                const nonStreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
                const response = await fetch(nonStreamUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Gemini API error:', response.status, errorText);
                    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
                }

                const data = await response.json();
                console.log('Received response from Gemini API:', JSON.stringify(data).substring(0, 200) + "...");

                if (data.candidates?.[0]?.content) {
                    const aiResponse = data.candidates[0].content.parts[0].text;

                    // AI yanıtını parse et ve dosya işleme komutlarını çıkar
                    const parsedResponse = parseAIResponse(aiResponse);
                    console.log("Parsed response:", {
                        textLength: parsedResponse.displayText.length,
                        fileOperations: parsedResponse.fileOperations.length
                    });

                    return NextResponse.json({
                        response: parsedResponse.displayText,
                        fileOperations: parsedResponse.fileOperations
                    });
                }
                console.error('Invalid response format from Gemini API:', JSON.stringify(data));
                return NextResponse.json({ error: 'Invalid response format from Gemini API' }, { status: 500 });
            }
        } catch (apiError: unknown) {
            console.error('API request error:', apiError);
            return NextResponse.json({
                error: `API request failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Gemini API general error:', error);
        return NextResponse.json({
            error: 'Failed to get AI response',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

interface FileOperation {
    operation: 'create' | 'edit';
    path: string;
    content: string;
}

interface ParsedResponse {
    displayText: string;
    fileOperations: FileOperation[];
}

// AI yanıtını parse et ve dosya işleme komutlarını çıkar
function parseAIResponse(response: string): ParsedResponse {
    console.log("Parsing AI response of length:", response.length);

    const fileOperationPattern = /```dosya-işlemi\s+işlem:\s*(create|edit)\s+dosya-yolu:\s*([^\n]+)\s+içerik:\s*([\s\S]*?)```/g;

    const fileOperations: FileOperation[] = [];
    let displayText = response;

    // Dosya işleme bloklarını bul
    let match;
    while ((match = fileOperationPattern.exec(response)) !== null) {
        const [fullMatch, operation, path, content] = match;

        console.log(`Found file operation: ${operation} for path: ${path}`);

        fileOperations.push({
            operation: operation as 'create' | 'edit',
            path: path.trim(),
            content: content.trim()
        });

        // Dosya işlemi bloklarını yanıttan çıkar
        displayText = displayText.replace(fullMatch,
            `[${operation === 'create' ? 'Yeni Dosya' : 'Dosya Düzenleme'}: ${path}]`);
    }

    if (fileOperations.length === 0) {
        console.log("No file operations found in response");
    }

    return {
        displayText,
        fileOperations
    };
}

// Stream parser for live parsing during streaming
export function parseStreamChunk(chunk: string): {
    text?: string;
    fileOperation?: FileOperation;
    isComplete?: boolean;
} {
    try {
        // Parse the JSON chunk
        const data = JSON.parse(chunk);

        // Check if this is a completed response
        if (data.promptFeedback) {
            return { isComplete: true };
        }

        // Get text from the chunk
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Check if this chunk contains a file operation
        const fileOperationPattern = /```dosya-işlemi\s+işlem:\s*(create|edit)\s+dosya-yolu:\s*([^\n]+)\s+içerik:\s*([\s\S]*?)```/;
        const match = fileOperationPattern.exec(text);

        if (match) {
            const [fullMatch, operation, path, content] = match;

            return {
                text: text.replace(fullMatch, `[${operation === 'create' ? 'Yeni Dosya' : 'Dosya Düzenleme'}: ${path}]`),
                fileOperation: {
                    operation: operation as 'create' | 'edit',
                    path: path.trim(),
                    content: content.trim()
                }
            };
        }

        return { text };
    } catch (error) {
        console.error('Error parsing stream chunk:', error);
        return {}; // Return empty object on error
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'TurkeyIDE AI Assistant API',
        status: 'active',
        model: 'gemini-1.5-flash',
        streaming: true
    })
}
