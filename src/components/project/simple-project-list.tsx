'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import {
    FolderOpen,
    Github,
    RefreshCw,
    AlertCircle,
    Calendar,
    Package
} from 'lucide-react';
import { ImportProjectModal } from './import-project-modal';
import { useIDEStore } from '@/store/ide-store';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface ProjectMetadata {
    id: string;
    name: string;
    framework: string;
    frameworkName: string;
    template: string;
    createdAt: string;
    path: string;
    packageManager: string;
    extensions: string[];
    type?: string;
}

interface SimpleProjectListProps {
    onRefresh?: () => void;
}

export function SimpleProjectList({ onRefresh }: SimpleProjectListProps) {
    const [projects, setProjects] = useState<ProjectMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const { toast } = useToast();

    const loadProjects = async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const response = await fetch('/api/project/list');
            if (!response.ok) {
                throw new Error('Failed to load projects');
            }
            const data = await response.json();
            setProjects(data.projects || []);
        } catch (error) {
            console.error('Error loading projects:', error);
            setErrorMessage('Projeler yüklenirken bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
    }, []);

    const handleOpenProject = async (project: ProjectMetadata) => {
        try {
            console.log("Opening project:", project);

            // Call the project open API which will handle file tree generation
            const response = await fetch(`/api/project/open?path=${encodeURIComponent(project.path)}`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to open project');
            }

            const data = await response.json();

            if (data.success) {
                // Update the store with the file tree if provided
                if (data.fileTree) {
                    const { setFileTree, togglePanel, panels } = useIDEStore.getState();
                    setFileTree([data.fileTree]);

                    // Open explorer panel if not visible
                    if (!panels.explorer.isVisible) {
                        togglePanel('explorer');
                    }
                }

                toast({
                    title: "Proje Açıldı",
                    description: `${project.name} projesi Explorer'da açıldı.`,
                });
            }

            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error opening project:', error);
            toast({
                title: "Hata",
                description: "Proje açılırken bir hata oluştu.",
                variant: "destructive"
            });
        }
    };

    const handleProjectImported = () => {
        loadProjects();
        setImportModalOpen(false);
    };

    const getFrameworkIcon = (framework: string) => {
        switch (framework) {
            case 'nextjs':
            case 'react':
            case 'react-vite':
                return '⚛️';
            case 'vue':
                return '💚';
            case 'angular':
                return '🅰️';
            case 'svelte':
                return '🧡';
            case 'python':
            case 'django':
            case 'fastapi':
                return '🐍';
            case 'nodejs':
            case 'express':
                return '💚';
            default:
                return '📁';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">GitHub Projeleri</h2>
                    <p className="text-muted-foreground">
                        GitHub'dan içeri aktarılan projeleriniz
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={loadProjects}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Yenile
                    </Button>
                    <Button onClick={() => setImportModalOpen(true)}>
                        <Github className="w-4 h-4 mr-2" />
                        GitHub'dan İçeri Aktar
                    </Button>
                </div>
            </div>

            {errorMessage && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            )}

            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader>
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                                <div className="h-8 bg-gray-200 rounded"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : projects.length === 0 ? (
                <Card className="text-center py-12">
                    <CardContent>
                        <Github className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Henüz proje yok</h3>
                        <p className="text-muted-foreground mb-4">
                            GitHub'dan projenizi içeri aktararak başlayın
                        </p>
                        <Button onClick={() => setImportModalOpen(true)}>
                            <Github className="w-4 h-4 mr-2" />
                            İlk Projeyi İçeri Aktar
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => (
                        <Card key={project.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{getFrameworkIcon(project.framework)}</span>
                                        <div>
                                            <CardTitle className="text-lg">{project.name}</CardTitle>
                                            <CardDescription className="flex items-center gap-1">
                                                <Package className="w-3 h-3" />
                                                {project.frameworkName}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    {formatDistanceToNow(new Date(project.createdAt), {
                                        addSuffix: true,
                                        locale: tr
                                    })}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="space-y-2">
                                    <div className="flex gap-1 flex-wrap">
                                        <Badge variant="secondary" className="text-xs">
                                            {project.packageManager}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                            GitHub
                                        </Badge>
                                    </div>
                                    <Button
                                        onClick={() => handleOpenProject(project)}
                                        className="w-full"
                                        size="sm"
                                    >
                                        <FolderOpen className="w-4 h-4 mr-2" />
                                        Projeyi Aç
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <ImportProjectModal
                open={importModalOpen}
                onOpenChange={setImportModalOpen}
                onProjectImported={handleProjectImported}
            />
        </div>
    );
}
