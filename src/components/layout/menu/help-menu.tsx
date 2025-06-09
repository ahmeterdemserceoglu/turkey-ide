'use client'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { HelpCircle, Info, Github, BookOpen, BugPlay, MessageSquareWarning, Bot } from "lucide-react"
import { useRouter } from "next/navigation"

export function HelpMenu() {
    const router = useRouter()

    const openDocs = () => {
        window.open('https://github.com/your-repo/turkish-ide/docs', '_blank')
    }

    const openGitHub = () => {
        window.open('https://github.com/your-repo/turkish-ide', '_blank')
    }

    const reportBug = () => {
        window.open('https://github.com/your-repo/turkish-ide/issues/new', '_blank')
    }

    const showAbout = () => {
        alert('TurkeyIDE v1.0.0\nWeb tabanlı modern Türkçe geliştirme ortamı.\n\n© 2023 TurkeyIDE Team')
    }

    const openAISettings = () => {
        router.push('/ai-settings')
    }

    const showKeyboardShortcuts = () => {
        const shortcuts = [
            "Klavye Kısayolları:",
            "",
            "Genel:",
            "- Ctrl+S: Kaydet",
            "- Ctrl+Z: Geri Al",
            "- Ctrl+Y: İleri Al",
            "- Ctrl+F: Bul",
            "- Ctrl+H: Bul ve Değiştir",
            "- F11: Tam Ekran",
            "",
            "Düzenleme:",
            "- Ctrl+X: Kes",
            "- Ctrl+C: Kopyala",
            "- Ctrl+V: Yapıştır",
            "- Ctrl+A: Tümünü Seç",
            "- Ctrl+/: Yorum Satırı",
            "",
            "Terminal:",
            "- Ctrl+T: Terminal Aç/Kapat",
            "- Ctrl+L: Terminal Temizle"
        ].join("\n")

        alert(shortcuts)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    Yardım
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Yardım ve Destek</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={openDocs}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    <span>Dokümantasyon</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={showKeyboardShortcuts}>
                    <MessageSquareWarning className="w-4 h-4 mr-2" />
                    <span>Klavye Kısayolları</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={openAISettings}>
                    <Bot className="w-4 h-4 mr-2" />
                    <span>AI Ayarları</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={openGitHub}>
                    <Github className="w-4 h-4 mr-2" />
                    <span>GitHub</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={reportBug}>
                    <BugPlay className="w-4 h-4 mr-2" />
                    <span>Hata Bildir</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={showAbout}>
                    <Info className="w-4 h-4 mr-2" />
                    <span>Hakkında</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
} 