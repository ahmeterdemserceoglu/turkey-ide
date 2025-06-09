'use client'

import { useState, useEffect } from 'react'
import { useAIStore, type AIProviderType } from '@/store/ai-store'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Bot, Trash2, Terminal, Info } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function AISettingsPage() {
    const {
        provider,
        setProvider,
        history,
        deleteSession,
        agentMode,
        toggleAgentMode,
        pendingFileOperations,
        completedFileOperations,
        clearFileOperations
    } = useAIStore()
    const [messageCount, setMessageCount] = useState(0)
    const [sessionCount, setSessionCount] = useState(0)
    const { toast } = useToast()

    useEffect(() => {
        // Count all messages across all sessions
        const totalMessages = history.reduce((total, session) => total + session.length, 0)
        setMessageCount(totalMessages)
        setSessionCount(history.length)
    }, [history])

    const handleClearHistory = () => {
        // Delete all sessions except the last one
        for (let i = history.length - 2; i >= 0; i--) {
            deleteSession(i)
        }
        // Clear the remaining session
        if (history.length > 0) {
            deleteSession(0)
        }

        toast({
            title: 'Sohbet geçmişi temizlendi',
            description: 'Tüm sohbet geçmişiniz başarıyla silindi.',
            duration: 3000,
        })
    }

    const handleClearFileOperations = () => {
        clearFileOperations()
        toast({
            title: 'Dosya işlemleri temizlendi',
            description: 'Bekleyen ve tamamlanan tüm dosya işlemleri temizlendi.',
            duration: 3000,
        })
    }

    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-8 flex items-center">
                <Bot className="mr-2" />
                AI Ayarları
            </h1>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>AI Modeli</CardTitle>
                        <CardDescription>
                            Kullanmak istediğiniz yapay zeka modelini seçin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            value={provider}
                            onValueChange={(value: string) => setProvider(value as AIProviderType)}
                            className="space-y-3"
                        >
                            <div className="flex items-center justify-between space-x-2 border p-4 rounded-md">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="gemini" id="gemini" />
                                    <Label htmlFor="gemini" className="flex items-center gap-2">
                                        Gemini
                                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Aktif</span>
                                    </Label>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Google tarafından geliştirilen çok yetenekli yapay zeka modeli
                                </p>
                            </div>

                            <div className="flex items-center justify-between space-x-2 border p-4 rounded-md opacity-50">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="claude" id="claude" disabled />
                                    <Label htmlFor="claude" className="flex items-center gap-2">
                                        Claude
                                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">Yakında</span>
                                    </Label>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Anthropic tarafından geliştirilen doğal dil işleme yetenekleri ile öne çıkan model
                                </p>
                            </div>

                            <div className="flex items-center justify-between space-x-2 border p-4 rounded-md opacity-50">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="gpt4" id="gpt4" disabled />
                                    <Label htmlFor="gpt4" className="flex items-center gap-2">
                                        GPT-4
                                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">Yakında</span>
                                    </Label>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    OpenAI'nin en gelişmiş geniş dil modeli
                                </p>
                            </div>
                        </RadioGroup>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Agent Modu</CardTitle>
                        <CardDescription>
                            Yapay zeka asistanının dosya oluşturma ve düzenleme yeteneklerini kontrol edin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center">
                                    <h4 className="font-medium">Agent Modu</h4>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="h-4 w-4 ml-2 text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                                Agent Modu açıkken, yapay zeka asistanı dosya işlemlerini otomatik olarak gerçekleştirebilir.
                                                Bu mod kapalıyken, asistan yalnızca öneriler sunar ve dosya işlemleri manuel olarak gerçekleştirilmelidir.
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Asistanın dosya oluşturma ve düzenleme önerilerini otomatik uygular
                                </p>
                            </div>
                            <Switch
                                checked={agentMode}
                                onCheckedChange={toggleAgentMode}
                                id="agent-mode"
                            />
                        </div>

                        <div className="mt-6">
                            <h4 className="font-medium mb-2">Dosya İşlemleri</h4>
                            <Tabs defaultValue="pending">
                                <TabsList className="mb-4">
                                    <TabsTrigger value="pending">
                                        Bekleyen ({pendingFileOperations.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="completed">
                                        Tamamlanan ({completedFileOperations.length})
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="pending">
                                    {pendingFileOperations.length > 0 ? (
                                        <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                                            {pendingFileOperations.map((op, index) => (
                                                <div key={index} className="text-sm p-2 border rounded flex justify-between items-center">
                                                    <div>
                                                        <span className="font-medium">{op.type === 'create' ? 'Oluştur' : 'Düzenle'}:</span> {op.path}
                                                    </div>
                                                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                                        Bekliyor
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Bekleyen dosya işlemi yok.</p>
                                    )}
                                </TabsContent>
                                <TabsContent value="completed">
                                    {completedFileOperations.length > 0 ? (
                                        <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                                            {completedFileOperations.map((op, index) => (
                                                <div key={index} className="text-sm p-2 border rounded flex justify-between items-center">
                                                    <div>
                                                        <span className="font-medium">{op.type === 'create' ? 'Oluştur' : 'Düzenle'}:</span> {op.path}
                                                    </div>
                                                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                                        Tamamlandı
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Tamamlanan dosya işlemi yok.</p>
                                    )}
                                </TabsContent>
                            </Tabs>
                            <Button
                                variant="outline"
                                onClick={handleClearFileOperations}
                                disabled={pendingFileOperations.length === 0 && completedFileOperations.length === 0}
                                className="mt-4"
                                size="sm"
                            >
                                Dosya İşlemlerini Temizle
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Sohbet Geçmişi</CardTitle>
                        <CardDescription>
                            Yapay zeka asistanı ile yaptığınız konuşmaları yönetin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm mb-4">
                            Şu anda <strong>{sessionCount} oturum</strong> ve <strong>{messageCount} mesaj</strong> sohbet geçmişinizde saklı.
                            Bu veriler tarayıcınızın localStorage'ında tutulmaktadır ve cihazınızdan dışarı çıkmaz.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button
                            variant="destructive"
                            onClick={handleClearHistory}
                            disabled={messageCount === 0}
                            className="flex items-center"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Sohbet Geçmişini Temizle
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
} 