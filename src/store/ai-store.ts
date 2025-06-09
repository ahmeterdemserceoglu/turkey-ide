import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AIMessage as BaseAIMessage } from '@/lib/ai/ai-service'

export type AIProviderType = 'gemini'

export interface FileOperation {
    type: 'create' | 'edit'
    path: string
    content: string
    status?: 'pending' | 'completed' | 'error'
    error?: string
    applied?: boolean
}

// Extended AIMessage with additional fields for the UI
export interface AIMessage extends BaseAIMessage {
    id?: string
    timestamp?: Date
    fileOperations?: FileOperation[]
    error?: boolean
    tempId?: string
}

export interface AIStoreState {
    provider: AIProviderType
    apiKey: string | null
    messages: AIMessage[]
    history: AIMessage[][]
    activeSessionIndex: number
    isLoading: boolean
    error: string | null
    agentMode: boolean
    pendingFileOperations: FileOperation[]
    completedFileOperations: FileOperation[]

    // Actions
    setProvider: (provider: AIProviderType) => void
    setApiKey: (apiKey: string | null) => void
    sendMessage: (message: string) => void
    addMessage: (message: AIMessage) => void
    updateMessage: (id: string, updates: Partial<AIMessage>) => void
    clearMessages: () => void
    startNewSession: () => void
    loadSession: (index: number) => void
    deleteSession: (index: number) => void
    setLoading: (isLoading: boolean) => void
    setError: (error: string | null) => void
    toggleAgentMode: () => void
    addPendingFileOperation: (operation: FileOperation) => void
    updateFileOperationStatus: (index: number, status: 'completed' | 'error', error?: string) => void
    clearFileOperations: () => void
}

export const useAIStore = create<AIStoreState>()(
    persist(
        (set, get) => ({
            provider: 'gemini' as AIProviderType,
            apiKey: null,
            messages: [],
            history: [[]],
            activeSessionIndex: 0,
            isLoading: false,
            error: null,
            agentMode: false,
            pendingFileOperations: [],
            completedFileOperations: [],

            setProvider: (provider) => set({ provider }),

            setApiKey: (apiKey) => set({ apiKey }),

            sendMessage: (message) => {
                const userMessage: AIMessage = {
                    id: Date.now().toString(),
                    role: 'user',
                    content: message,
                    timestamp: new Date(),
                }
                get().addMessage(userMessage)
            },

            addMessage: (message) => {
                const messageWithId: AIMessage = {
                    ...message,
                    id: message.id || message.tempId || Date.now().toString(),
                    timestamp: message.timestamp || new Date(),
                }

                set((state) => {
                    const updatedMessages = [...state.messages, messageWithId]
                    const updatedHistory = [...state.history]
                    updatedHistory[state.activeSessionIndex] = updatedMessages

                    return {
                        messages: updatedMessages,
                        history: updatedHistory,
                    }
                })

                // Auto-detect and extract file operations from assistant messages
                if (message.role === 'assistant' && !message.fileOperations) {
                    const content = message.content
                    const fileOperationRegex = /```dosya-işlemi\s+işlem:\s+(create|edit)\s+dosya-yolu:\s+([^\n]+)\s+içerik:\s+([\s\S]*?)```/g

                    let match
                    while ((match = fileOperationRegex.exec(content)) !== null) {
                        const operationType = match[1] as 'create' | 'edit'
                        const filePath = match[2]
                        const fileContent = match[3]

                        get().addPendingFileOperation({
                            type: operationType,
                            path: filePath,
                            content: fileContent,
                            status: 'pending'
                        })
                    }
                }
            },

            updateMessage: (id, updates) => {
                set((state) => {
                    const messageIndex = state.messages.findIndex(m => m.id === id || m.tempId === id)

                    if (messageIndex === -1) return state

                    const updatedMessages = [...state.messages]
                    updatedMessages[messageIndex] = {
                        ...updatedMessages[messageIndex],
                        ...updates,
                    }

                    const updatedHistory = [...state.history]
                    updatedHistory[state.activeSessionIndex] = updatedMessages

                    return {
                        messages: updatedMessages,
                        history: updatedHistory,
                    }
                })
            },

            clearMessages: () => {
                set((state) => {
                    const updatedHistory = [...state.history]
                    updatedHistory[state.activeSessionIndex] = []

                    return {
                        messages: [],
                        history: updatedHistory,
                    }
                })
            },

            startNewSession: () => {
                set((state) => {
                    return {
                        messages: [],
                        history: [...state.history, []],
                        activeSessionIndex: state.history.length,
                    }
                })
            },

            loadSession: (index) => {
                set((state) => {
                    if (index >= 0 && index < state.history.length) {
                        return {
                            activeSessionIndex: index,
                            messages: state.history[index],
                        }
                    }
                    return state
                })
            },

            deleteSession: (index) => {
                set((state) => {
                    if (index >= 0 && index < state.history.length) {
                        const updatedHistory = [...state.history]
                        updatedHistory.splice(index, 1)

                        // If there are no sessions left, create an empty one
                        if (updatedHistory.length === 0) {
                            updatedHistory.push([])
                        }

                        // Adjust active index if needed
                        let newActiveIndex = state.activeSessionIndex
                        if (index === state.activeSessionIndex) {
                            newActiveIndex = Math.max(0, index - 1)
                        } else if (index < state.activeSessionIndex) {
                            newActiveIndex = state.activeSessionIndex - 1
                        }

                        return {
                            history: updatedHistory,
                            activeSessionIndex: newActiveIndex,
                            messages: updatedHistory[newActiveIndex],
                        }
                    }
                    return state
                })
            },

            setLoading: (isLoading) => set({ isLoading }),

            setError: (error) => set({ error }),

            toggleAgentMode: () => set((state) => ({ agentMode: !state.agentMode })),

            addPendingFileOperation: (operation) => {
                set((state) => ({
                    pendingFileOperations: [...state.pendingFileOperations, operation]
                }))
            },

            updateFileOperationStatus: (index, status, error) => {
                set((state) => {
                    const updatedPendingOps = [...state.pendingFileOperations]
                    const operation = updatedPendingOps[index]

                    if (operation) {
                        operation.status = status
                        if (error) operation.error = error

                        if (status === 'completed') {
                            const completedOps = [...state.completedFileOperations, operation]
                            updatedPendingOps.splice(index, 1)

                            return {
                                pendingFileOperations: updatedPendingOps,
                                completedFileOperations: completedOps
                            }
                        }
                    }

                    return { pendingFileOperations: updatedPendingOps }
                })
            },

            clearFileOperations: () => {
                set({
                    pendingFileOperations: [],
                    completedFileOperations: []
                })
            }
        }),
        {
            name: 'turkish-ide-ai-store',
        }
    )
) 