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
import { Menu, Save, FolderPlus, FileText, FolderOpen, FilePlus2, Upload, Download, X } from "lucide-react"
import { useIDEStore } from "@/store/ide-store"
import { useRouter } from 'next/navigation'

export function FileMenu() {
    const { tabs, activeTabId, updateTabContent, markTabAsSaved } = useIDEStore()
    const router = useRouter()

    const activeTab = tabs.find(tab => tab.id === activeTabId)

    const handleNewFile = async () => {
        // Burada yeni dosya oluşturma işlemi yapılabilir
        const fileName = prompt("Dosya adı:")
        if (!fileName) return

        try {
            const response = await fetch('/api/filesystem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    path: `/${fileName}`,
                    content: '',
                    action: 'write'
                })
            })

            const result = await response.json()
            if (result.success) {
                // Dosya ağacını güncelleme ve yeni dosyayı açma işlemleri burada yapılabilir
                alert(`${fileName} dosyası oluşturuldu`)
            }
        } catch (error) {
            console.error('Dosya oluşturma hatası:', error)
        }
    }

    const handleSaveFile = async () => {
        if (!activeTab) return

        try {
            const response = await fetch('/api/filesystem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    path: activeTab.path,
                    content: activeTab.content,
                    action: 'write'
                })
            })

            const result = await response.json()
            if (result.success) {
                markTabAsSaved(activeTab.id)
                console.log('Dosya kaydedildi')
            }
        } catch (error) {
            console.error('Dosya kaydetme hatası:', error)
        }
    }

    const handleOpenFile = () => {
        // Dosya açma işlemi burada olacak
        alert("Dosya açma dialog'u burada açılacak")
    }

    const handleExit = () => {
        if (confirm("TurkeyIDE'den çıkmak istediğinizden emin misiniz?")) {
            window.close()
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Menu className="w-4 h-4 mr-2" />
                    Dosya
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Dosya İşlemleri</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleNewFile}>
                    <FilePlus2 className="w-4 h-4 mr-2" />
                    <span>Yeni Dosya</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOpenFile}>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    <span>Dosya Aç</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSaveFile} disabled={!activeTab}>
                    <Save className="w-4 h-4 mr-2" />
                    <span>Kaydet</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!activeTab}>
                    <Download className="w-4 h-4 mr-2" />
                    <span>Farklı Kaydet</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExit}>
                    <X className="w-4 h-4 mr-2" />
                    <span>Çıkış</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
} 