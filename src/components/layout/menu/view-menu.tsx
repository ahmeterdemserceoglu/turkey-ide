'use client'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useIDEStore } from "@/store/ide-store"
import { SplitSquareVertical, PanelLeft, PanelBottom, PanelRightOpen, Sun, Moon, Maximize2, Minimize2 } from "lucide-react"
import { useState } from "react"

export function ViewMenu() {
    const {
        theme,
        setTheme,
        panels,
        togglePanel,
        terminalHeight,
        setTerminalHeight,
        sidebarWidth,
        setSidebarWidth
    } = useIDEStore()

    const [isFullscreen, setIsFullscreen] = useState(false)

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
            setIsFullscreen(true)
        } else {
            document.exitFullscreen()
            setIsFullscreen(false)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    Görünüm
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Görünüm</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuCheckboxItem
                    checked={panels.explorer.isVisible}
                    onCheckedChange={() => togglePanel('explorer')}
                >
                    <PanelLeft className="w-4 h-4 mr-2" />
                    <span>Dosya Gezgini</span>
                </DropdownMenuCheckboxItem>

                <DropdownMenuCheckboxItem
                    checked={panels.terminal.isVisible}
                    onCheckedChange={() => togglePanel('terminal')}
                >
                    <PanelBottom className="w-4 h-4 mr-2" />
                    <span>Terminal</span>
                </DropdownMenuCheckboxItem>

                <DropdownMenuCheckboxItem
                    checked={panels.github.isVisible}
                    onCheckedChange={() => togglePanel('github')}
                >
                    <PanelRightOpen className="w-4 h-4 mr-2" />
                    <span>GitHub</span>
                </DropdownMenuCheckboxItem>

                <DropdownMenuCheckboxItem
                    checked={panels.ai.isVisible}
                    onCheckedChange={() => togglePanel('ai')}
                >
                    <PanelRightOpen className="w-4 h-4 mr-2" />
                    <span>AI Asistan</span>
                </DropdownMenuCheckboxItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={toggleFullscreen}>
                    {isFullscreen ? (
                        <>
                            <Minimize2 className="w-4 h-4 mr-2" />
                            <span>Tam Ekrandan Çık</span>
                        </>
                    ) : (
                        <>
                            <Maximize2 className="w-4 h-4 mr-2" />
                            <span>Tam Ekran</span>
                        </>
                    )}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                    {theme === 'dark' ? (
                        <>
                            <Sun className="w-4 h-4 mr-2" />
                            <span>Açık Tema</span>
                        </>
                    ) : (
                        <>
                            <Moon className="w-4 h-4 mr-2" />
                            <span>Koyu Tema</span>
                        </>
                    )}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => {
                    setSidebarWidth(300)
                    setTerminalHeight(200)
                }}>
                    <SplitSquareVertical className="w-4 h-4 mr-2" />
                    <span>Varsayılan Düzen</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
} 