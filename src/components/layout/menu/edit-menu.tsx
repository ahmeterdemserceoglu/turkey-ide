'use client'

import { useEffect, useRef } from 'react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuShortcut
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Scissors, Copy, ClipboardPaste, Undo2, Redo2, Search, Replace } from "lucide-react"
import { useIDEStore } from "@/store/ide-store"

// No global type declarations - we'll use type guards instead

export function EditMenu() {
    const { tabs, activeTabId } = useIDEStore()
    const activeTab = tabs.find(tab => tab.id === activeTabId)

    const handleCopy = () => {
        document.execCommand('copy')
    }

    const handleCut = () => {
        document.execCommand('cut')
    }

    const handlePaste = () => {
        document.execCommand('paste')
    }

    const handleUndo = () => {
        try {
            if (typeof window !== 'undefined' && 'monaco' in window) {
                const monaco = (window as any).monaco;
                const editor = monaco?.editor?.getEditors?.()?.[0]
                if (editor) {
                    editor.trigger('keyboard', 'undo', null)
                }
            }
        } catch (error) {
            console.error('Undo işlemi yapılamadı:', error)
        }
    }

    const handleRedo = () => {
        try {
            if (typeof window !== 'undefined' && 'monaco' in window) {
                const monaco = (window as any).monaco;
                const editor = monaco?.editor?.getEditors?.()?.[0]
                if (editor) {
                    editor.trigger('keyboard', 'redo', null)
                }
            }
        } catch (error) {
            console.error('Redo işlemi yapılamadı:', error)
        }
    }

    const handleFind = () => {
        try {
            if (typeof window !== 'undefined' && 'monaco' in window) {
                const monaco = (window as any).monaco;
                const editor = monaco?.editor?.getEditors?.()?.[0]
                if (editor) {
                    editor.trigger('keyboard', 'actions.find', null)
                }
            }
        } catch (error) {
            console.error('Bul işlemi başlatılamadı:', error)
        }
    }

    const handleReplace = () => {
        try {
            if (typeof window !== 'undefined' && 'monaco' in window) {
                const monaco = (window as any).monaco;
                const editor = monaco?.editor?.getEditors?.()?.[0]
                if (editor) {
                    editor.trigger('keyboard', 'editor.action.startFindReplaceAction', null)
                }
            }
        } catch (error) {
            console.error('Değiştir işlemi başlatılamadı:', error)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    Düzen
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Düzenleme</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleUndo} disabled={!activeTab}>
                    <Undo2 className="w-4 h-4 mr-2" />
                    <span>Geri Al</span>
                    <DropdownMenuShortcut>Ctrl+Z</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRedo} disabled={!activeTab}>
                    <Redo2 className="w-4 h-4 mr-2" />
                    <span>İleri Al</span>
                    <DropdownMenuShortcut>Ctrl+Y</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCut} disabled={!activeTab}>
                    <Scissors className="w-4 h-4 mr-2" />
                    <span>Kes</span>
                    <DropdownMenuShortcut>Ctrl+X</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopy} disabled={!activeTab}>
                    <Copy className="w-4 h-4 mr-2" />
                    <span>Kopyala</span>
                    <DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePaste} disabled={!activeTab}>
                    <ClipboardPaste className="w-4 h-4 mr-2" />
                    <span>Yapıştır</span>
                    <DropdownMenuShortcut>Ctrl+V</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleFind} disabled={!activeTab}>
                    <Search className="w-4 h-4 mr-2" />
                    <span>Bul</span>
                    <DropdownMenuShortcut>Ctrl+F</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleReplace} disabled={!activeTab}>
                    <Replace className="w-4 h-4 mr-2" />
                    <span>Bul ve Değiştir</span>
                    <DropdownMenuShortcut>Ctrl+H</DropdownMenuShortcut>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
} 