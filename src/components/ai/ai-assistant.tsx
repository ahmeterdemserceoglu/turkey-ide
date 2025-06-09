'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Trash2, Settings, Terminal, Code, FileText, type LucideIcon, FileCode, Edit, CheckCircle, AlertCircle, RefreshCcw, GitBranch, Download, Eye, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { useIDEStore } from '@/store/ide-store'
import { useToast } from '@/components/ui/use-toast'
import { useAIStore, type AIMessage, type FileOperation } from '@/store/ai-store'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'

export function AIAssistant() {
    const {
        messages,
        addMessage,
        updateMessage,
        clearMessages,
        startNewSession,
        loadSession,
        history,
        activeSessionIndex,
        deleteSession,
        isLoading,
        setLoading,
        error,
        setError,
        agentMode,
        toggleAgentMode,
        pendingFileOperations,
        completedFileOperations,
        addPendingFileOperation,
        updateFileOperationStatus,
        clearFileOperations
    } = useAIStore()

    const [input, setInput] = useState('')
    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const { toast } = useToast()

    const { terminalCwd, currentFile, tabs, addTab, setActiveTab, fileTree } = useIDEStore()

    const [showFileDialog, setShowFileDialog] = useState(false)
    const [selectedOperation, setSelectedOperation] = useState<FileOperation | null>(null)
    const [applyingOperation, setApplyingOperation] = useState(false)
    const [expandedOperations, setExpandedOperations] = useState<Record<string, boolean>>({})
    const [streamingMessage, setStreamingMessage] = useState('')
    const [tempAssistantMessageId, setTempAssistantMessageId] = useState<string | null>(null)
    const [collectedFileOperations, setCollectedFileOperations] = useState<FileOperation[]>([])

    // Auto scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
        }
    }, [messages.length, streamingMessage])

    // Build project context for better AI understanding
    const buildProjectContext = () => {
        return {
            currentFile: currentFile?.path,
            workingDirectory: terminalCwd,
            openTabs: tabs.map(tab => tab.path),
            fileTree: fileTree,
            agentMode: agentMode
        }
    }

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: AIMessage = {
            role: 'user',
            content: input.trim(),
            id: Date.now().toString(),
            timestamp: new Date()
        }

        addMessage(userMessage)
        setInput('')
        setLoading(true)
        setStreamingMessage('')
        setCollectedFileOperations([])

        try {
            console.log("Sending message to AI API:", input.trim().substring(0, 50) + "...");

            // Build comprehensive context for better responses
            const projectContext = buildProjectContext();

            // Generate a temporary ID for the assistant message that will be updated during streaming
            const tempId = Date.now().toString()
            setTempAssistantMessageId(tempId)

            // Add an empty assistant message that will be updated during streaming
            addMessage({
                role: 'assistant',
                content: '',
                id: tempId,
                timestamp: new Date()
            })

            // API isteği için gönderilecek verileri hazırla
            const requestData = {
                message: input.trim(),
                history: messages.slice(-6), // Son 3 konuşmayı gönder
                context: projectContext,
                stream: true // Enable streaming
            };

            console.log("Request payload:", JSON.stringify(requestData).substring(0, 100) + "...");

            // Stream API endpoint'ine bağlan
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            })

            if (!response.ok) {
                let errorMessage = 'API isteği başarısız oldu';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.details || `API hatası: ${response.status}`;
                } catch (e) {
                    errorMessage = `API hatası: ${response.status}`;
                }
                throw new Error(errorMessage);
            }

            if (!response.body) {
                throw new Error('Stream yanıtı alınamadı');
            }

            // Stream yanıtını işle
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });

                // Handle SSE format where each line starts with "data: "
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonData = JSON.parse(line.substring(6));

                            // Extract text from the chunk
                            if (jsonData.candidates && jsonData.candidates[0]?.content?.parts?.[0]?.text) {
                                const text = jsonData.candidates[0].content.parts[0].text;

                                // Check for file operations
                                const fileOperationRegex = /```dosya-işlemi\s+işlem:\s+(create|edit)\s+dosya-yolu:\s+([^\n]+)\s+içerik:\s+([\s\S]*?)```/g;
                                let match;

                                let processedText = text;

                                // Collect file operations
                                while ((match = fileOperationRegex.exec(text)) !== null) {
                                    const [fullMatch, operation, path, content] = match;

                                    // Add to collected operations if it's a new one
                                    const existingIndex = collectedFileOperations.findIndex(op => op.path === path);
                                    if (existingIndex === -1) {
                                        const newOperation: FileOperation = {
                                            type: operation === 'create' ? 'create' : 'edit',
                                            path: path.trim(),
                                            content: content.trim(),
                                            status: 'pending'
                                        };

                                        setCollectedFileOperations(prev => [...prev, newOperation]);
                                    }

                                    // Replace in displayed text
                                    processedText = processedText.replace(
                                        fullMatch,
                                        `[${operation === 'create' ? 'Yeni Dosya' : 'Dosya Düzenleme'}: ${path}]`
                                    );
                                }

                                accumulatedContent = processedText;
                                setStreamingMessage(processedText);

                                // Update the temporary message as we receive chunks
                                updateMessage(tempId, { content: processedText });
                            }
                        } catch (e) {
                            console.error('Error parsing streaming chunk:', e);
                        }
                    }
                }
            }

            // Streaming tamamlandığında mesajı güncelle
            console.log("Streaming completed, finalizing message");
            updateMessage(tempId, {
                content: accumulatedContent,
                fileOperations: collectedFileOperations
            });

            // Agent modunda otomatik olarak dosya işlemlerini uygula
            if (agentMode && collectedFileOperations.length > 0) {
                console.log("Agent mode active, automatically applying file operations");
                setTimeout(() => {
                    collectedFileOperations.forEach((operation) => {
                        applyFileOperation(operation, tempId);
                    });
                }, 1000);
            }

            // Dosya işlemleri varsa bildirim göster
            if (collectedFileOperations.length > 0) {
                toast({
                    title: "Dosya işlemleri bulundu",
                    description: `AI asistan ${collectedFileOperations.length} dosya işlemi önerdi. ${agentMode ? 'Agent modu açık, işlemler otomatik uygulanacak.' : 'Bunları uygulamak için yanıttaki butonları kullanabilirsiniz.'}`,
                    duration: 5000,
                });
            }

        } catch (error: any) {
            console.error('AI Error:', error)
            setError(error.message || 'Bilinmeyen hata')

            // Error message if streaming fails
            if (tempAssistantMessageId) {
                updateMessage(tempAssistantMessageId, {
                    content: `Üzgünüm, bir hata oluştu: ${error.message || 'Bilinmeyen hata'}. Lütfen tekrar deneyin.`,
                    error: true
                });
            }

            toast({
                title: "AI Yanıt Hatası",
                description: error.message || "Yanıt alınırken bir hata oluştu",
                variant: "destructive",
                duration: 5000,
            });
        } finally {
            setLoading(false)
            setTempAssistantMessageId(null)
            inputRef.current?.focus()
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    // Dosya işlemini görüntüle ve onayla
    const handleViewFileOperation = (operation: FileOperation) => {
        setSelectedOperation(operation)
        setShowFileDialog(true)
    }

    // Toggle file operations section expansion
    const toggleOperationsExpand = (messageId: string) => {
        setExpandedOperations(prev => ({
            ...prev,
            [messageId]: !prev[messageId]
        }));
    }

    // Dosya işlemini uygula
    const applyFileOperation = async (operation: FileOperation, messageId: string) => {
        setApplyingOperation(true)

        try {
            const endpoint = '/api/filesystem'
            const body = {
                action: operation.type === 'create' ? 'create-file' : 'write',
                path: operation.path,
                content: operation.content
            }

            console.log(`Applying file operation: ${operation.type} on ${operation.path}`);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Dosya işlemi sırasında bir hata oluştu')
            }

            // İşlem başarılı oldu, mesajı güncelle
            const message = messages.find(m => m.id === messageId);
            if (message && message.fileOperations) {
                updateMessage(messageId, {
                    fileOperations: message.fileOperations.map(op =>
                        op.path === operation.path ? { ...op, applied: true } : op
                    )
                });
            }

            // Dialog'u kapat
            setShowFileDialog(false)

            // Dosyayı tab olarak aç
            const fileName = operation.path.split('/').pop() || operation.path;
            const tabId = `tab-${Date.now().toString()}`;
            addTab({
                id: tabId,
                path: operation.path,
                type: getFileType(operation.path),
                name: fileName,
                content: operation.content,
                isDirty: false,
                language: getLanguageFromPath(operation.path)
            })

            // Yeni oluşturulan sekmede aktif olmak için activeTab'ı ayarla
            setActiveTab(tabId);

            toast({
                title: "Dosya işlemi başarılı",
                description: `"${fileName}" ${operation.type === 'create' ? 'oluşturuldu' : 'güncellendi'}.`,
                duration: 3000,
            })
        } catch (error: any) {
            console.error('File operation error:', error)
            toast({
                title: "Hata",
                description: error.message || "Dosya işlemi uygulanırken bir hata oluştu.",
                variant: "destructive",
                duration: 5000,
            })

            // Hata durumunda da mesajı güncelle
            const message = messages.find(m => m.id === messageId);
            if (message && message.fileOperations) {
                updateMessage(messageId, {
                    fileOperations: message.fileOperations.map(op =>
                        op.path === operation.path ? { ...op, applied: false, error: error.message } : op
                    )
                });
            }
        } finally {
            setApplyingOperation(false)
        }
    }

    // Apply all file operations in a message
    const applyAllFileOperations = (message: AIMessage) => {
        const fileOperations = message.fileOperations || [];
        if (!fileOperations || fileOperations.length === 0) return;

        fileOperations
            .filter(op => !op.applied && !op.error)
            .forEach(operation => {
                applyFileOperation(operation, message.id || '');
            });
    }

    // Dosya türünü belirle
    const getFileType = (path: string): 'code' | 'image' | 'text' | 'unknown' => {
        const extension = path.split('.').pop()?.toLowerCase() || ''

        if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'md', 'py', 'rb', 'php', 'java', 'c', 'cpp', 'h', 'go', 'rs', 'swift'].includes(extension)) {
            return 'code'
        }

        if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(extension)) {
            return 'image'
        }

        if (['txt', 'csv', 'log', 'yml', 'yaml', 'toml', 'ini'].includes(extension)) {
            return 'text'
        }

        return 'unknown'
    }

    // Dosya uzantısından dil belirleme
    const getLanguageFromPath = (path: string): string => {
        const extension = path.split('.').pop()?.toLowerCase() || ''

        const languageMap: Record<string, string> = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'less': 'less',
            'json': 'json',
            'md': 'markdown',
            'py': 'python',
            'rb': 'ruby',
            'php': 'php',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'h': 'c',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift'
        }

        return languageMap[extension] || 'plaintext'
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="flex items-center text-lg">
                    <Bot className="mr-2" size={20} />
                    AI Asistanı
                </CardTitle>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-2">
                        <span className="text-xs text-muted-foreground">Agent</span>
                        <Switch checked={agentMode} onCheckedChange={toggleAgentMode} />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Settings size={16} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Sohbetler</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {history.map((session, index) => (
                                <DropdownMenuItem
                                    key={index}
                                    onClick={() => loadSession(index)}
                                    className={cn(
                                        "flex items-center justify-between",
                                        index === activeSessionIndex && "bg-primary/10"
                                    )}
                                >
                                    <span className="truncate max-w-[150px]">
                                        {session.length > 0
                                            ? session[0].content.substring(0, 20) + (session[0].content.length > 20 ? '...' : '')
                                            : `Boş sohbet ${index + 1}`}
                                    </span>
                                    {session.length > 0 && (
                                        <Badge variant="outline" className="ml-2">{session.length}</Badge>
                                    )}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => startNewSession()}>
                                <FileText size={14} className="mr-2" />
                                Yeni Sohbet Başlat
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => clearMessages()}>
                                <Trash2 size={14} className="mr-2" />
                                Mevcut Sohbeti Temizle
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => window.open('/ai-settings', '_blank')}>
                                <Settings size={14} className="mr-2" />
                                AI Ayarları
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <Separator />
            <CardContent className="flex-grow p-0 flex flex-col">
                <ScrollArea ref={scrollAreaRef} className="flex-grow p-4">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                            <Bot size={40} className="mb-4 text-primary" />
                            <h3 className="text-lg font-medium mb-2">AI Asistanına Hoş Geldiniz</h3>
                            <p className="max-w-md mb-4">
                                Kodlama, proje yönetimi veya dosya işlemleri hakkında her türlü sorunuzu sorabilirsiniz. Size en iyi şekilde yardımcı olmaya çalışacağım.
                            </p>
                            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                                <Button
                                    variant="outline"
                                    className="flex justify-start items-center p-3 h-auto"
                                    onClick={() => setInput("Proje yapısını analiz edip önerilerde bulunabilir misin?")}
                                >
                                    <FileText size={16} className="mr-2" />
                                    <span className="text-left">Proje analizi</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex justify-start items-center p-3 h-auto"
                                    onClick={() => setInput("Bir bug'ı nasıl düzeltebilirim?")}
                                >
                                    <Code size={16} className="mr-2" />
                                    <span className="text-left">Hata ayıklama</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex justify-start items-center p-3 h-auto"
                                    onClick={() => setInput("Şu dosyaları oluşturabilir misin...")}
                                >
                                    <FileCode size={16} className="mr-2" />
                                    <span className="text-left">Dosya oluşturma</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex justify-start items-center p-3 h-auto"
                                    onClick={() => setInput("Terminal komutları hakkında yardım eder misin?")}
                                >
                                    <Terminal size={16} className="mr-2" />
                                    <span className="text-left">Terminal yardımı</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex justify-start items-center p-3 h-auto col-span-2"
                                    onClick={() => setInput("Git workflow sürecini nasıl yönetebilirim?")}
                                >
                                    <GitBranch size={16} className="mr-2" />
                                    <span className="text-left">Git ve versiyon kontrolü</span>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {messages.map((message) => renderMessage(message))}
                        </div>
                    )}
                    {isLoading && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted mt-4">
                            <Loader2 className="animate-spin" size={16} />
                            <span className="text-sm">AI yanıtınız hazırlanıyor...</span>
                        </div>
                    )}
                </ScrollArea>
                <div className="p-4 pt-2">
                    <div className="flex gap-2">
                        <Input
                            ref={inputRef}
                            placeholder="Bir soru sorun veya komut yazın..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            disabled={isLoading}
                            className="flex-grow"
                        />
                        <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
                            {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                        </Button>
                    </div>
                </div>
            </CardContent>

            {/* Dosya işlemi dialog'u */}
            <Dialog open={showFileDialog} onOpenChange={setShowFileDialog}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedOperation?.type === 'create' ? 'Dosya Oluştur' : 'Dosyayı Düzenle'}: {selectedOperation?.path}
                        </DialogTitle>
                        <DialogDescription>
                            Bu işlem {selectedOperation?.type === 'create' ? 'yeni bir dosya oluşturacak' : 'varolan dosyayı düzenleyecek'}. Devam etmek istiyor musunuz?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="border rounded-md overflow-hidden">
                        <div className="bg-muted p-2 text-xs font-mono flex justify-between items-center">
                            <span>{selectedOperation?.path}</span>
                            <Badge variant="outline">
                                {getLanguageFromPath(selectedOperation?.path || '')}
                            </Badge>
                        </div>
                        <pre className="p-4 text-sm overflow-auto max-h-80 bg-black text-white">
                            <code>{selectedOperation?.content}</code>
                        </pre>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowFileDialog(false)}>
                            İptal
                        </Button>
                        <Button
                            onClick={() => {
                                if (selectedOperation) {
                                    const msgWithOperation = messages.find(m =>
                                        m.fileOperations?.some(op => op.path === selectedOperation.path)
                                    );
                                    if (msgWithOperation && msgWithOperation.id) {
                                        applyFileOperation(selectedOperation, msgWithOperation.id);
                                    }
                                }
                            }}
                            disabled={applyingOperation}
                        >
                            {applyingOperation ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    İşleniyor...
                                </>
                            ) : (
                                <>
                                    {selectedOperation?.type === 'create' ? 'Oluştur' : 'Düzenle'}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )

    // Helper function to render a message
    function renderMessage(message: AIMessage) {
        const isUser = message.role === 'user';
        const fileOperations = message.fileOperations || [];
        const hasFileOperations = !isUser && fileOperations.length > 0;
        const isExpanded = expandedOperations[message.id || ''] || false;
        const pendingOperations = hasFileOperations
            ? fileOperations.filter((op) => !op.applied && !op.error).length
            : 0;

        const messageId = message.id || '';

        return (
            <div
                key={messageId}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
                <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`rounded-full h-8 w-8 flex items-center justify-center text-white ${isUser ? 'bg-primary' : 'bg-blue-500'} flex-shrink-0`}>
                        {isUser ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={`rounded-lg p-3 ${isUser ? 'bg-primary text-primary-foreground' : message.error ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-muted'}`}>
                        <div className="prose prose-sm dark:prose-invert whitespace-pre-wrap max-w-none break-words">
                            {message.content}
                        </div>

                        {/* Dosya işlemi butonları */}
                        {hasFileOperations && (
                            <div className="mt-3 border-t pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-medium">Dosya İşlemleri</p>
                                        <Badge variant="outline" className="text-xs">
                                            {fileOperations.length}
                                        </Badge>
                                        {pendingOperations > 0 && (
                                            <Badge className="bg-blue-500 text-white text-xs">
                                                {pendingOperations} bekliyor
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        {pendingOperations > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-xs px-2"
                                                onClick={() => applyAllFileOperations(message)}
                                            >
                                                <Download size={12} className="mr-1" />
                                                Tümünü Uygula
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => toggleOperationsExpand(messageId)}
                                        >
                                            {isExpanded ? (
                                                <ChevronUp size={14} />
                                            ) : (
                                                <ChevronDown size={14} />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="space-y-2 mt-2">
                                        {fileOperations.map((op) => (
                                            <div key={op.path} className="flex items-center justify-between gap-2 bg-background/50 p-2 rounded-md">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <Badge variant={op.applied ? "success" as const : op.error ? "destructive" : "outline"} className="flex-shrink-0">
                                                        {op.type === 'create' ? 'Yeni' : 'Düzenle'}
                                                    </Badge>
                                                    <span className="text-xs truncate font-mono">{op.path}</span>
                                                </div>
                                                <div className="flex gap-1 flex-shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs px-2"
                                                        onClick={() => handleViewFileOperation(op)}
                                                    >
                                                        <Eye size={12} className="mr-1" />
                                                        Görüntüle
                                                    </Button>
                                                    {!op.applied && !op.error && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-xs px-2 bg-primary/10 hover:bg-primary/20"
                                                            onClick={() => applyFileOperation(op, messageId)}
                                                        >
                                                            <Download size={12} className="mr-1" />
                                                            Uygula
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }
}
