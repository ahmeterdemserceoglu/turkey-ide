'use client'

import { useState, useRef, useEffect } from 'react'
import { useIDEStore, type TerminalSplit, type TerminalInstance } from '@/store/ide-store'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { X, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Terminal işlevleri için arayüz
interface TerminalRef {
    clear: () => void;
    search: () => void;
}

// Dynamically import terminal components with SSR disabled
const Terminal = dynamic(() => import('./terminal').then(mod => mod.Terminal), {
    ssr: false
})

const PowerShellTerminal = dynamic(() => import('./powershell-terminal').then(mod => mod.PowerShellTerminal), {
    ssr: false
})

const CmdTerminal = dynamic(() => import('./cmd-terminal').then(mod => mod.CmdTerminal), {
    ssr: false
})

interface TerminalSplitViewProps {
    split: TerminalSplit
    terminals: TerminalInstance[]
    activeTerminalId: string | null
    onTerminalSelect: (terminalId: string) => void
    onCloseSplit: (splitId: string) => void
    onRemoveTerminal: (splitId: string, terminalId: string) => void
    className?: string
}

export function TerminalSplitView({
    split,
    terminals,
    activeTerminalId,
    onTerminalSelect,
    onCloseSplit,
    onRemoveTerminal,
    className
}: TerminalSplitViewProps) {
    const [panelSizes, setPanelSizes] = useState<number[]>(split.sizes)
    const { resizeSplit } = useIDEStore()

    // Panel boyutları değiştiğinde store'u güncelle
    const handleResize = (sizes: number[]) => {
        setPanelSizes(sizes)
        resizeSplit(split.id, sizes)
    }

    // Split'teki terminal'leri getir
    const splitTerminals = terminals.filter(t => split.terminals.includes(t.id))

    if (splitTerminals.length === 0) {
        return null
    }

    const renderTerminal = (terminal: TerminalInstance, isActive: boolean) => {
        const terminalRef = useRef<TerminalRef>(null)

        return (
            <div
                key={terminal.id}
                className={cn(
                    "h-full border border-border/50 rounded-sm overflow-hidden",
                    isActive && "border-primary/50"
                )}
            >
                {/* Terminal Header */}
                <div className="flex items-center justify-between px-2 py-1 bg-accent/20 border-b">
                    <div
                        className="flex items-center gap-2 cursor-pointer flex-1"
                        onClick={() => onTerminalSelect(terminal.id)}
                    >
                        <span className="text-xs font-medium">{terminal.name}</span>
                        <span className="text-xs text-muted-foreground">
                            {terminal.type.toUpperCase()}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => onRemoveTerminal(split.id, terminal.id)}
                        >
                            <X className="w-3 h-3" />
                        </Button>
                    </div>
                </div>

                {/* Terminal Content */}
                <div className="h-[calc(100%-24px)]">
                    {terminal.type === 'cmd' && <CmdTerminal ref={isActive ? terminalRef : undefined} />}
                    {terminal.type === 'powershell' && <PowerShellTerminal ref={isActive ? terminalRef : undefined} />}
                    {terminal.type === 'bash' && <Terminal ref={isActive ? terminalRef : undefined} />}
                </div>
            </div>
        )
    }

    return (
        <div className={cn("h-full", className)}>
            {/* Split Header */}
            <div className="flex items-center justify-between px-2 py-1 border-b bg-accent/10">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                        Split ({split.direction}) - {splitTerminals.length} terminals
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => onCloseSplit(split.id)}
                >
                    <X className="w-3 h-3" />
                </Button>
            </div>

            {/* Split Content */}
            <div className="h-[calc(100%-28px)]">
                <ResizablePanelGroup
                    direction={split.direction === 'horizontal' ? 'vertical' : 'horizontal'}
                    onLayout={handleResize}
                >
                    {splitTerminals.map((terminal, index) => (
                        <div key={terminal.id}>
                            <ResizablePanel
                                defaultSize={panelSizes[index] || 50}
                                minSize={20}
                            >
                                {renderTerminal(terminal, terminal.id === activeTerminalId)}
                            </ResizablePanel>
                            {index < splitTerminals.length - 1 && (
                                <ResizableHandle className="bg-border/50 hover:bg-border" />
                            )}
                        </div>
                    ))}
                </ResizablePanelGroup>
            </div>
        </div>
    )
}
