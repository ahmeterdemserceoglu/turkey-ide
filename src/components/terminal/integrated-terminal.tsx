'use client'

import { useIDEStore, type TerminalType } from '@/store/ide-store'
import dynamic from 'next/dynamic'
import { Minimize2, Plus, X, Terminal as TerminalIcon, ClipboardCopy, RotateCw, Lock, Search, FolderOpen, SplitSquareHorizontal, SplitSquareVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRef, useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
    ContextMenuShortcut,
} from "@/components/ui/context-menu"
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useTerminalInitialization } from '../integrated-terminal'
import { TerminalProjectManager } from './terminal-project-manager'
import { TerminalSplitView } from './terminal-split-view'

// Terminal işlevleri için arayüz
export interface TerminalRef {
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

interface IntegratedTerminalProps {
    className?: string
}

// Terminalimizin global referansı
let globalTerminalRef: TerminalRef | null = null;

export function IntegratedTerminal({ className }: IntegratedTerminalProps) {
    const {
        togglePanel,
        terminals,
        activeTerminalId,
        addTerminal,
        removeTerminal,
        setActiveTerminal,
        renameTerminal,
        setTerminalCwd,
        terminalSplits,
        activeSplitId,
        splitTerminalHorizontal,
        splitTerminalVertical,
        closeSplit,
        removeTerminalFromSplit
    } = useIDEStore()

    const [isInitialized, setIsInitialized] = useState(false)
    const [lockedTerminals, setLockedTerminals] = useState<string[]>([])

    // Tek bir terminal ref'i kullanacağız
    const terminalRef = useRef<TerminalRef>(null);

    // Terminal referansını global olarak saklayalım
    useEffect(() => {
        if (terminalRef.current) {
            globalTerminalRef = terminalRef.current;
        }
    }, [terminalRef.current]);

    // Use the terminal initialization hook
    useTerminalInitialization()

    // Initialize with active project directory
    useEffect(() => {
        // Get file tree to check for project folders
        const { fileTree } = useIDEStore.getState();

        if (fileTree && fileTree.length > 0) {
            // Look for project folders (non-system folders)
            const projectFolders = fileTree.filter(node =>
                node.type === 'folder' && !node.name.startsWith('.')
            );

            if (projectFolders.length > 0) {
                // Set terminal directory to first project folder
                setTerminalCwd(projectFolders[0].path);
                console.log(`Terminal tab initialized to project: ${projectFolders[0].path}`);
            }
        }
    }, [setTerminalCwd]);

    const handleAddTerminal = () => {
        // Varsayılan olarak CMD terminali ekleyelim
        addTerminal('cmd');
    };

    const handleRemoveTerminal = (id: string, event: React.MouseEvent) => {
        if (event) {
            event.stopPropagation(); // Tıklama olayının üst öğeye yayılmasını engelle
        }

        // If terminal is locked, don't remove it
        if (lockedTerminals.includes(id)) {
            return;
        }

        removeTerminal(id);
    };

    const changeTerminalType = (id: string, type: TerminalType) => {
        // Terminal tipini değiştir
        useIDEStore.setState(state => ({
            terminals: state.terminals.map(t =>
                t.id === id ? { ...t, type } : t
            )
        }));
    };

    const toggleTerminalLock = (id: string) => {
        setLockedTerminals(prev =>
            prev.includes(id)
                ? prev.filter(termId => termId !== id)
                : [...prev, id]
        );
    };

    const clearActiveTerminal = () => {
        if (terminalRef.current) {
            terminalRef.current.clear();
        }
    };

    const searchActiveTerminal = () => {
        if (terminalRef.current) {
            terminalRef.current.search();
        }
    };

    // Terminal tipine göre ikon rengini belirle
    const getTerminalTypeIcon = (type: TerminalType) => {
        switch (type) {
            case 'powershell':
                return <TerminalIcon className="h-4 w-4 mr-2 text-blue-500" />;
            case 'bash':
                return <TerminalIcon className="h-4 w-4 mr-2 text-orange-500" />;
            default:
                return <TerminalIcon className="h-4 w-4 mr-2" />;
        }
    };

    return (
        <div className={cn("h-full", className)}>
            <div className="flex items-center justify-between px-2 py-1 border-b bg-accent/20">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">TERMİNAL</span>
                </div>
                <div className="flex items-center gap-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={searchActiveTerminal}
                                >
                                    <Search className="w-3 h-3" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Search in Terminal (Ctrl+F)</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => activeTerminalId && splitTerminalHorizontal(activeTerminalId)}
                                    disabled={!activeTerminalId}
                                >
                                    <SplitSquareHorizontal className="w-3 h-3" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Split Horizontally</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => activeTerminalId && splitTerminalVertical(activeTerminalId)}
                                    disabled={!activeTerminalId}
                                >
                                    <SplitSquareVertical className="w-3 h-3" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Split Vertically</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={clearActiveTerminal}
                                >
                                    <RotateCw className="w-3 h-3" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Clear Terminal</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={handleAddTerminal}
                                >
                                    <Plus className="w-3 h-3" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>New Terminal</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => togglePanel('terminal')}
                                >
                                    <Minimize2 className="w-3 h-3" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Minimize</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            <Tabs
                value={activeTerminalId || 'terminal-1'}
                onValueChange={setActiveTerminal}
                className="h-[calc(100%-28px)]"
            >
                <TabsList className="bg-accent/10 border-b rounded-none h-8 px-2 flex justify-start">
                    {terminals.map((terminal) => (
                        <ContextMenu key={terminal.id}>
                            <ContextMenuTrigger>
                                <div className="flex items-center group relative">
                                    <TabsTrigger
                                        value={terminal.id}
                                        className="h-7 text-xs px-4 data-[state=active]:bg-background rounded-none"
                                    >
                                        <div className="flex items-center">
                                            {getTerminalTypeIcon(terminal.type)}
                                            <span>{terminal.name}</span>
                                            {lockedTerminals.includes(terminal.id) && (
                                                <Lock className="ml-1 h-3 w-3 text-muted-foreground" />
                                            )}
                                        </div>
                                    </TabsTrigger>
                                    {terminals.length > 1 && !lockedTerminals.includes(terminal.id) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 rounded-full absolute right-1 top-1 opacity-0 group-hover:opacity-100"
                                            onClick={(e) => handleRemoveTerminal(terminal.id, e)}
                                        >
                                            <X className="w-2 h-2" />
                                        </Button>
                                    )}
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-56">
                                <ContextMenuItem onClick={() => changeTerminalType(terminal.id, 'cmd')}>
                                    <TerminalIcon className="h-4 w-4 mr-2" />
                                    <span>Command Prompt</span>
                                    {terminal.type === 'cmd' && (
                                        <ContextMenuShortcut>✓</ContextMenuShortcut>
                                    )}
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => changeTerminalType(terminal.id, 'powershell')}>
                                    <TerminalIcon className="h-4 w-4 mr-2 text-blue-500" />
                                    <span>PowerShell</span>
                                    {terminal.type === 'powershell' && (
                                        <ContextMenuShortcut>✓</ContextMenuShortcut>
                                    )}
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => changeTerminalType(terminal.id, 'bash')}>
                                    <TerminalIcon className="h-4 w-4 mr-2 text-orange-500" />
                                    <span>Git Bash</span>
                                    {terminal.type === 'bash' && (
                                        <ContextMenuShortcut>✓</ContextMenuShortcut>
                                    )}
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem onClick={() => splitTerminalHorizontal(terminal.id)}>
                                    <SplitSquareHorizontal className="h-4 w-4 mr-2" />
                                    <span>Yatay Böl</span>
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => splitTerminalVertical(terminal.id)}>
                                    <SplitSquareVertical className="h-4 w-4 mr-2" />
                                    <span>Dikey Böl</span>
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem onClick={() => {
                                    const newName = prompt('Terminal adını değiştir:', terminal.name);
                                    if (newName) {
                                        renameTerminal(terminal.id, newName);
                                    }
                                }}>
                                    Yeniden Adlandır
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => toggleTerminalLock(terminal.id)}>
                                    {lockedTerminals.includes(terminal.id) ? 'Kilidi Aç' : 'Kilitle'}
                                    <ContextMenuShortcut>
                                        <Lock className="h-3 w-3" />
                                    </ContextMenuShortcut>
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => {
                                    if (terminalRef.current) {
                                        terminalRef.current.clear();
                                    }
                                }}>
                                    Temizle
                                    <ContextMenuShortcut>
                                        <RotateCw className="h-3 w-3" />
                                    </ContextMenuShortcut>
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => {
                                    if (terminalRef.current && terminal.id === activeTerminalId) {
                                        terminalRef.current.search();
                                    }
                                }}>
                                    Ara
                                    <ContextMenuShortcut>
                                        <Search className="h-3 w-3" />
                                    </ContextMenuShortcut>
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem
                                    className={cn(
                                        "text-red-500",
                                        lockedTerminals.includes(terminal.id) && "opacity-50 cursor-not-allowed"
                                    )}
                                    onClick={() => {
                                        if (!lockedTerminals.includes(terminal.id)) {
                                            removeTerminal(terminal.id);
                                        }
                                    }}
                                >
                                    Kapat
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                    ))}
                </TabsList>

                <div className="h-[calc(100%-32px)]">
                    {/* Split View'lar */}
                    {activeSplitId && terminalSplits.length > 0 && (
                        <div className="h-full">
                            {terminalSplits.map((split) => (
                                <TerminalSplitView
                                    key={split.id}
                                    split={split}
                                    terminals={terminals}
                                    activeTerminalId={activeTerminalId}
                                    onTerminalSelect={setActiveTerminal}
                                    onCloseSplit={closeSplit}
                                    onRemoveTerminal={removeTerminalFromSplit}
                                    className={split.id === activeSplitId ? "block" : "hidden"}
                                />
                            ))}
                        </div>
                    )}

                    {/* Normal Terminal View (sadece split yoksa göster) */}
                    {!activeSplitId && terminals.map((terminal) => (
                        <TabsContent
                            key={terminal.id}
                            value={terminal.id}
                            className="h-full m-0 p-0 border-none data-[state=active]:flex-1 relative"
                        >
                            {/* Sadece aktif terminale ref bağlayalım */}
                            {terminal.id === activeTerminalId ? (
                                <>
                                    {terminal.type === 'cmd' && <CmdTerminal ref={terminalRef} />}
                                    {terminal.type === 'powershell' && <PowerShellTerminal ref={terminalRef} />}
                                    {terminal.type === 'bash' && <Terminal ref={terminalRef} />}
                                </>
                            ) : (
                                <>
                                    {terminal.type === 'cmd' && <CmdTerminal />}
                                    {terminal.type === 'powershell' && <PowerShellTerminal />}
                                    {terminal.type === 'bash' && <Terminal />}
                                </>
                            )}
                        </TabsContent>
                    ))}
                </div>
            </Tabs>
        </div>
    )
}

// Dışa aktarılan temizleme işlevi
export function clearTerminal() {
    if (globalTerminalRef) {
        globalTerminalRef.clear();
        return true;
    }
    return false;
}
