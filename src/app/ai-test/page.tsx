'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AIAssistant } from '@/components/ai/ai-assistant'
import { Button } from '@/components/ui/button'
import { useAIStore } from '@/store/ai-store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

export default function AITestPage() {
    const {
        agentMode,
        toggleAgentMode,
        pendingFileOperations,
        completedFileOperations,
        clearFileOperations
    } = useAIStore()

    return (
        <div className="container py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">AI Testi</h1>
                    <p className="text-muted-foreground">
                        Yapay zeka asistanının test edilmesi için kullanılır
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span>Agent Modu:</span>
                        <Badge variant={agentMode ? "success" : "outline"}>
                            {agentMode ? "Açık" : "Kapalı"}
                        </Badge>
                    </div>
                    <Button variant={agentMode ? "default" : "outline"} onClick={toggleAgentMode}>
                        {agentMode ? "Agent Modunu Kapat" : "Agent Modunu Aç"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 h-[700px]">
                    <AIAssistant />
                </div>
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Dosya İşlemleri</CardTitle>
                            <CardDescription>
                                AI asistanı tarafından önerilen ve uygulanan dosya işlemleri
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
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
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                            {pendingFileOperations.map((op, index) => (
                                                <div key={index} className="p-2 border rounded-md">
                                                    <div className="flex items-center justify-between">
                                                        <Badge variant="outline">
                                                            {op.type === 'create' ? 'Yeni' : 'Düzenle'}
                                                        </Badge>
                                                        <Badge variant="secondary">
                                                            {op.status || 'bekliyor'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm mt-1 font-mono truncate">{op.path}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-muted-foreground">
                                            Bekleyen dosya işlemi yok
                                        </div>
                                    )}
                                </TabsContent>
                                <TabsContent value="completed">
                                    {completedFileOperations.length > 0 ? (
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                            {completedFileOperations.map((op, index) => (
                                                <div key={index} className="p-2 border rounded-md">
                                                    <div className="flex items-center justify-between">
                                                        <Badge variant="outline">
                                                            {op.type === 'create' ? 'Yeni' : 'Düzenle'}
                                                        </Badge>
                                                        <Badge variant="success">
                                                            tamamlandı
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm mt-1 font-mono truncate">{op.path}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-muted-foreground">
                                            Tamamlanan dosya işlemi yok
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>

                            <Button
                                variant="outline"
                                className="w-full mt-4"
                                onClick={clearFileOperations}
                                disabled={pendingFileOperations.length === 0 && completedFileOperations.length === 0}
                            >
                                Tüm Dosya İşlemlerini Temizle
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
} 