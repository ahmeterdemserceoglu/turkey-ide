'use client'

import { useState, useEffect } from 'react'
import { useIDEStore, getProjectTerminalCommands } from '@/store/ide-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import dynamic from 'next/dynamic'
import {
    FolderOpen,
    Terminal,
    Plus,
    History,
    Star,
    Play,
    Settings,
    GitBranch,
    Package,
    Zap
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

// Dynamically import CmdTerminal to use in project terminals
const CmdTerminal = dynamic(() => import('./cmd-terminal').then(mod => mod.CmdTerminal), {
    ssr: false
})

interface ProjectInfo {
    type: string
    path: string
    suggestedCommands: string[]
}

export function TerminalProjectManager() {
    const {
        terminals,
        activeTerminalId,
        directoryHistory,
        currentProject,
        addProjectTerminal,
        updateTerminalWorkingDirectory,
        getRecentDirectories,
        addToDirectoryHistory,
        detectProjectType,
        setActiveTerminal,
    } = useIDEStore()

    const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null)
    const [isDetecting, setIsDetecting] = useState(false)
    const [newProjectPath, setNewProjectPath] = useState('')

    const activeTerminal = terminals.find(t => t.id === activeTerminalId)
    const projectTerminals = terminals.filter(t => t.isProjectTerminal)
    const recentDirs = getRecentDirectories()

    useEffect(() => {
        if (currentProject) {
            detectProject(currentProject.path)
        }
    }, [currentProject])

    const detectProject = async (path: string) => {
        setIsDetecting(true)
        try {
            const type = await detectProjectType(path)
            const response = await fetch('/api/project-detector', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            })
            const data = await response.json()
            setProjectInfo(data)
        } catch (error) {
            console.error('Project detection failed:', error)
        } finally {
            setIsDetecting(false)
        }
    }

    const createProjectTerminal = async () => {
        if (!newProjectPath.trim()) return

        const path = newProjectPath.trim()
        const projectName = path.split('/').pop() || 'Project'

        setIsDetecting(true)
        try {
            const type = await detectProjectType(path)
            addProjectTerminal(path, projectName, type)
            addToDirectoryHistory(path)
            setNewProjectPath('')
            detectProject(path)
        } catch (error) {
            console.error('Failed to create project terminal:', error)
        } finally {
            setIsDetecting(false)
        }
    }

    const runSuggestedCommand = async (command: string) => {
        if (!activeTerminalId || !currentProject) return

        try {
            await fetch('/api/terminal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command,
                    sessionId: activeTerminalId,
                    cwd: currentProject.path
                })
            })
        } catch (error) {
            console.error('Failed to run command:', error)
        }
    }

    const switchToDirectory = (path: string) => {
        if (activeTerminalId) {
            updateTerminalWorkingDirectory(activeTerminalId, path)
            addToDirectoryHistory(path)
        }
    }

    const getProjectIcon = (type: string) => {
        const icons = {
            nextjs: <Package className="w-4 h-4" />,
            react: <Package className="w-4 h-4" />,
            vue: <Package className="w-4 h-4" />,
            angular: <Package className="w-4 h-4" />,
            nodejs: <Package className="w-4 h-4" />,
            python: <Zap className="w-4 h-4" />,
            java: <GitBranch className="w-4 h-4" />,
            csharp: <Settings className="w-4 h-4" />,
            rust: <Settings className="w-4 h-4" />,
            go: <Play className="w-4 h-4" />,
            generic: <FolderOpen className="w-4 h-4" />
        }
        return icons[type as keyof typeof icons] || icons.generic
    }

    return (
        <div className="p-4 space-y-4">
            {/* Current Project Info */}
            {currentProject && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                            {getProjectIcon(currentProject.type)}
                            {currentProject.name}
                            <Badge variant="outline" className="text-xs">
                                {currentProject.type}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground mb-3">{currentProject.path}</p>

                        {/* Suggested Commands */}
                        {projectInfo && projectInfo.suggestedCommands.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-medium">Önerilen Komutlar:</p>
                                <div className="flex flex-wrap gap-1">
                                    {projectInfo.suggestedCommands.slice(0, 3).map((command) => (
                                        <Button
                                            key={command}
                                            variant="outline"
                                            size="sm"
                                            className="text-xs h-7"
                                            onClick={() => runSuggestedCommand(command)}
                                        >
                                            <Play className="w-3 h-3 mr-1" />
                                            {command}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* New Project Terminal */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Yeni Proje Terminali</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                    <div className="flex gap-2">
                        <Input
                            placeholder="/proje/yolu"
                            value={newProjectPath}
                            onChange={(e) => setNewProjectPath(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && createProjectTerminal()}
                            className="text-xs"
                        />
                        <Button
                            onClick={createProjectTerminal}
                            disabled={!newProjectPath.trim() || isDetecting}
                            size="sm"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Project Terminals */}
            {projectTerminals.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Terminal className="w-4 h-4" />
                            Proje Terminalleri
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-4">
                            {projectTerminals.map(terminal => {
                                // Get commands from store
                                const initialCommands = terminal.workingDirectory ?
                                    getProjectTerminalCommands(terminal.workingDirectory) :
                                    undefined;

                                return (
                                    <div key={terminal.id} className="border rounded-md">
                                        <div className="bg-secondary/20 p-2 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                {getProjectIcon(terminal.projectType || 'generic')}
                                                <span className="text-sm font-medium">{terminal.projectName || terminal.name}</span>
                                            </div>
                                            <Badge variant="outline" className="text-xs">
                                                {terminal.projectType}
                                            </Badge>
                                        </div>
                                        <div className="h-[400px] border-t" id={`terminal-container-${terminal.id}`}>
                                            <CmdTerminal
                                                isProjectTerminal={true}
                                                projectPath={terminal.workingDirectory}
                                                projectName={terminal.projectName}
                                                initialCommands={initialCommands}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Projeler oluşturulurken kullanıcı görebilsin diye bir mesaj göster */}
                        {projectTerminals.some(t =>
                            getProjectTerminalCommands(t.workingDirectory || '') && !t.projectSetupComplete
                        ) && (
                                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md text-sm">
                                    <p className="font-medium text-yellow-800 dark:text-yellow-300">Proje kurulumu devam ediyor</p>
                                    <p className="text-yellow-700 dark:text-yellow-400 text-xs mt-1">
                                        Proje kurulumu tamamlanana kadar lütfen bu pencereyi kapatmayın. Komutların tamamlanması birkaç dakika sürebilir.
                                    </p>
                                </div>
                            )}
                    </CardContent>
                </Card>
            )}

            {/* Recent Directories */}
            {recentDirs.length > 1 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <History className="w-4 h-4" />
                            Son Dizinler
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <ScrollArea className="max-h-24">
                            <div className="space-y-1">
                                {recentDirs.slice(1, 6).map((dir) => (
                                    <Button
                                        key={dir}
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start text-xs h-8"
                                        onClick={() => switchToDirectory(dir)}
                                    >
                                        <FolderOpen className="w-3 h-3 mr-2" />
                                        {dir}
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}

            {/* Quick Actions */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Hızlı İşlemler</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" className="text-xs">
                            <GitBranch className="w-3 h-3 mr-1" />
                            Git Status
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs">
                            <Package className="w-3 h-3 mr-1" />
                            npm install
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
