'use client'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Terminal, Plus, Minimize2 } from "lucide-react"
import { useIDEStore, TerminalType } from "@/store/ide-store"

export function TerminalMenu() {
    const {
        togglePanel,
        panels,
        addTerminal
    } = useIDEStore()

    const handleNewTerminal = (type: TerminalType) => {
        // Yeni terminal oluştur
        addTerminal(type);

        // Terminal paneli görünür değilse görünür yap
        if (!panels.terminal.isVisible) {
            togglePanel('terminal')
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    Terminal
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Terminal İşlemleri</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Plus className="w-4 h-4 mr-2" />
                        <span>Yeni Terminal</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-48">
                        <DropdownMenuItem onClick={() => handleNewTerminal('cmd')}>
                            <Terminal className="w-4 h-4 mr-2" />
                            <span>Command Prompt</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleNewTerminal('powershell')}>
                            <Terminal className="w-4 h-4 mr-2 text-blue-500" />
                            <span>PowerShell</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleNewTerminal('bash')}>
                            <Terminal className="w-4 h-4 mr-2 text-orange-500" />
                            <span>Git Bash</span>
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuItem onClick={() => togglePanel('terminal')}>
                    <Minimize2 className="w-4 h-4 mr-2" />
                    <span>{panels.terminal.isVisible ? 'Terminali Gizle' : 'Terminali Göster'}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
} 