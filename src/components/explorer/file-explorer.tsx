'use client'

import React, { useState, useEffect, useCallback, useRef, useContext } from 'react'
import { ChevronDown, ChevronRight, File, Folder, FolderOpen, Plus, MoreHorizontal, Terminal, Copy, Edit, Trash, FileCode, ClipboardCopy, Clipboard, Settings, Play, Package, Code, AlertTriangle, Download, Eye, EyeOff, Github, Upload, FileText, FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useIDEStore, type FileNode, type Tab, type Project } from '@/store/ide-store'
import { useGitHubStore } from '@/store/github-store'
import { githubService } from '@/services/github-service'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { getLanguageIcon, getLanguageColor, detectLanguageFromFilename, getPackageManagers, getAvailableCommands, LanguageInfo } from '@/lib/language-detector'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Spinner } from '@/components/ui/spinner'
// @ts-ignore
import { eventBus } from '@/lib/event-bus'
import { getCurrentProject, getProjectFileTree } from '@/lib/local-storage'

interface ApiFileObject {
  name: string
  type: 'file' | 'folder'
  path: string
}

interface FileTreeItemProps {
  node: FileNode
  depth: number
  onFileSelect: (file: FileNode) => void
  onToggleExpand: (nodeId: string) => void
}

// Onay Dialogu
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  cancelLabel,
  onConfirm
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FileTreeItem({ node, depth, onFileSelect, onToggleExpand }: FileTreeItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const {
    setFileToDelete,
    setShowDeleteDialog,
    setError
  } = useIDEStore()

  // Dışarıdan gelen state ve fonksiyonları alabilmek için context kullanımı
  const {
    setShowNewFileDialog,
    setShowNewFolderDialog,
    setSelectedFolderPath
  } = useContext(FileExplorerContext)

  const handleClick = () => {
    if (node.type === 'folder') {
      onToggleExpand(node.id)
    } else {
      onFileSelect(node)
    }
  }

  const getFileIcon = (fileName: string) => {
    return getLanguageIcon(fileName)
  }

  const handleCopyPath = () => {
    navigator.clipboard.writeText(node.path)
      .then(() => {
        console.log('Path copied to clipboard')
      })
      .catch(err => {
        console.error('Failed to copy path: ', err)
        setError('Yol kopyalanamadı: ' + err.message)
      })
  }

  const handleCopyContent = () => {
    if (node.type === 'file' && node.content) {
      navigator.clipboard.writeText(node.content)
        .then(() => {
          console.log('Content copied to clipboard')
        })
        .catch(err => {
          console.error('Failed to copy content: ', err)
          setError('İçerik kopyalanamadı: ' + err.message)
        })
    } else {
      setError('İçerik kopyalanamadı: Dosya içeriği yüklenmemiş')
    }
  }

  const handleDelete = () => {
    setFileToDelete(node.path)
    setShowDeleteDialog(true)
  }

  const handleNewFile = () => {
    // Klasör yolunu seç ve yeni dosya diyaloğunu aç
    setSelectedFolderPath(node.path)
    setShowNewFileDialog(true)
  }

  const handleNewFolder = () => {
    // Klasör yolunu seç ve yeni klasör diyaloğunu aç
    setSelectedFolderPath(node.path)
    setShowNewFolderDialog(true)
  }

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={cn(
              "flex items-center py-1 px-2 cursor-pointer hover:bg-accent/50 text-sm",
              isHovered && "bg-accent/30"
            )}
            style={{ paddingLeft: `${(depth + 1) * 12}px` }}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="mr-1">
              {node.type === 'folder' ? (
                node.isExpanded ? (
                  <FolderOpen className="h-4 w-4 text-blue-500" />
                ) : (
                  <Folder className="h-4 w-4 text-blue-500" />
                )
              ) : (
                getFileIcon(node.name) || <File className="h-4 w-4 text-gray-500" />
              )}
            </div>

            <div className="mr-1">
              {node.type === 'folder' && (
                node.isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )
              )}
            </div>

            <span className="truncate">{node.name}</span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          {node.type === 'file' && (
            <ContextMenuItem onClick={() => onFileSelect(node)}>
              <FileCode className="h-4 w-4 mr-2" />
              <span>Dosyayı Aç</span>
            </ContextMenuItem>
          )}

          {node.type === 'file' && (
            <ContextMenuItem onClick={handleCopyContent}>
              <Copy className="h-4 w-4 mr-2" />
              <span>İçeriği Kopyala</span>
            </ContextMenuItem>
          )}

          <ContextMenuItem onClick={handleCopyPath}>
            <Copy className="h-4 w-4 mr-2" />
            <span>Yolu Kopyala</span>
          </ContextMenuItem>

          {node.type === 'folder' && (
            <>
              <ContextMenuItem onClick={handleNewFile}>
                <FileText className="h-4 w-4 mr-2" />
                <span>Yeni Dosya</span>
              </ContextMenuItem>

              <ContextMenuItem onClick={handleNewFolder}>
                <FolderPlus className="h-4 w-4 mr-2" />
                <span>Yeni Klasör</span>
              </ContextMenuItem>

              <ContextMenuSeparator />
            </>
          )}

          <ContextMenuItem onClick={handleDelete} className="text-red-500">
            <Trash className="h-4 w-4 mr-2" />
            <span>{node.type === 'folder' ? 'Klasörü Sil' : 'Dosyayı Sil'}</span>
          </ContextMenuItem>

          <ContextMenuSeparator />
          <ContextMenuItem disabled>
            {node.type === 'folder'
              ? 'Klasör'
              : (detectLanguageFromFilename(node.name)?.displayName || 'Bilinmeyen')} {node.type === 'folder' ? '' : 'Dosyası'}
          </ContextMenuItem>
          <ContextMenuItem disabled>
            <span className="text-xs text-muted-foreground">{node.path}</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {node.type === 'folder' && node.isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onFileSelect={onFileSelect}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Context tanımlama
type FileExplorerContextType = {
  setShowNewFileDialog: (show: boolean) => void
  setShowNewFolderDialog: (show: boolean) => void
  setSelectedFolderPath: (path: string | null) => void
}

const FileExplorerContext = React.createContext<FileExplorerContextType>({
  setShowNewFileDialog: () => { },
  setShowNewFolderDialog: () => { },
  setSelectedFolderPath: () => { }
})

export function FileExplorer() {
  const {
    fileTree,
    setFileTree,
    setCurrentFile,
    currentProject,
    setCurrentProject,
    showLocalFiles,
    setShowLocalFiles,
    togglePanel,
    addTab,
    tabs,
    activeTabId,
    setActiveTab,
    setShowDeleteDialog,
    setFileToDelete,
    fileToDelete,
    showDeleteDialog,
    deleteFile
  } = useIDEStore()

  const { selectedRepo, currentBranch } = useGitHubStore()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showGithubWarningDialog, setShowGithubWarningDialog] = useState(false)
  const [pendingGitHubAction, setPendingGitHubAction] = useState<(() => void) | null>(null)
  const [isPushing, setIsPushing] = useState(false)
  const [showPushDialog, setShowPushDialog] = useState(false)
  const [commitMessage, setCommitMessage] = useState('')
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showNewFileDialog, setShowNewFileDialog] = useState(false)
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null)

  // Event listeners for GitHub integration
  useEffect(() => {
    // Listen for project opened events
    const handleProjectOpened = (project: Project) => {
      console.log('Project opened:', project.name);
      setCurrentProject(project);
      loadProjectFileTree(project);
    };

    // Subscribe to events
    eventBus.on('project:opened', handleProjectOpened);

    // Clean up
    return () => {
      eventBus.off('project:opened', handleProjectOpened);
    };
  }, []);

  // Load project file tree when component mounts
  useEffect(() => {
    // Load GitHub repositories if available
    const loadGitHubRepos = async () => {
      if (selectedRepo) {
        loadSelectedGitHubRepo();
      } else {
        loadGitHubReposFromLocalStorage();
      }
    };

    loadGitHubRepos();
  }, [selectedRepo]);

  // Load a project's file tree
  const loadProjectFileTree = (project: Project) => {
    // Only allow GitHub repositories
    if (project && project.path.startsWith('/')) {
      console.log('Loading GitHub project:', project.name);

      // Set current project
      setCurrentProject(project);

      // Load file tree from storage
      const repoName = project.path.split('/')[1];
      if (repoName) {
        const repoStructure = localStorage.getItem(`github-repo-${repoName}-structure`);
        if (repoStructure) {
          try {
            const parsedStructure = JSON.parse(repoStructure);
            setFileTree([parsedStructure]);
            return true;
          } catch (error) {
            console.error('Error parsing GitHub repo structure:', error);
            setError('Failed to load project structure. Please try again.');
          }
        } else {
          // Redirect to GitHub panel if structure not found
          console.log('GitHub repo structure not found, redirecting to GitHub panel');
          togglePanel('github');
          setError(`GitHub repository structure not found. Please load the repository from the GitHub panel.`);
        }
      }
    } else {
      setError('Only GitHub projects are supported');
    }

    return false;
  };

  // Load a selected GitHub repository
  const loadSelectedGitHubRepo = useCallback(() => {
    if (!selectedRepo) return;

    try {
      // Try to load structure for this specific repo
      const storedStructure = localStorage.getItem(`github-repo-${selectedRepo.name}-structure`);
      if (!storedStructure) return;

      // Parse the structure
      const repoStructure = JSON.parse(storedStructure);

      // Check if this is the project folder structure
      if (repoStructure.type === 'folder') {
        // Set the file tree to show just the project folder directly
        setFileTree([repoStructure]);
        console.log(`Loaded GitHub repository structure for ${selectedRepo.name}`);
      } else {
        console.error('Invalid repository structure format');
      }
    } catch (error) {
      console.error('Error loading GitHub repository structure:', error);
    }
  }, [selectedRepo, setFileTree]);

  // Load GitHub repositories from localStorage
  const loadGitHubReposFromLocalStorage = useCallback(() => {
    try {
      // Try to load previously opened GitHub repos
      const storedReposString = localStorage.getItem('github-repos');
      if (!storedReposString) return;

      const storedRepos = JSON.parse(storedReposString);
      if (!storedRepos || !storedRepos.length) return;

      // Get the most recently accessed repo
      const mostRecentRepo = [...storedRepos].sort((a, b) =>
        new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
      )[0];

      // Check if we have the structure stored
      const storedStructure = localStorage.getItem(`github-repo-${mostRecentRepo.name}-structure`);
      if (!storedStructure) return;

      // Parse the structure
      const repoStructure = JSON.parse(storedStructure);

      // Check if this is the project folder structure
      if (repoStructure.type === 'folder') {
        // Set the file tree to show just the project folder directly
        setFileTree([repoStructure]);
        console.log(`Loaded GitHub repository structure for ${mostRecentRepo.name}`);
      } else {
        console.error('Invalid repository structure format');
      }
    } catch (error) {
      console.error('Error loading GitHub repository structure:', error);
    }
  }, [setFileTree]);

  // Toggle node expansion in the file tree
  const handleToggleExpand = (nodeId: string) => {
    const updateNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, isExpanded: !node.isExpanded };
        } else if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };

    setFileTree(updateNode(fileTree));
  };

  // Handle file selection
  const onFileSelect = async (file: FileNode) => {
    try {
      setCurrentFile(file);

      if (file.type === 'file') {
        // For GitHub files, we need to load content if not already loaded
        if (file.path.startsWith('/') && !file.content) {
          setIsLoading(true);

          try {
            // Try to get file content from localStorage first
            const cachedContent = localStorage.getItem(`file-content-${file.path}`);

            if (cachedContent) {
              // Update the file node with cached content
              const updatedFile = {
                ...file,
                content: cachedContent
              };

              // Update in file tree
              const updateFileContent = (nodes: FileNode[]): FileNode[] => {
                return nodes.map(node => {
                  if (node.id === file.id) {
                    return updatedFile;
                  } else if (node.children && node.children.length > 0) {
                    return {
                      ...node,
                      children: updateFileContent(node.children)
                    };
                  }
                  return node;
                });
              };

              setFileTree(updateFileContent(fileTree));
              setCurrentFile(updatedFile);

              // Create a tab for the file
              createTabForFile(updatedFile, cachedContent);
            } else {
              // If not in cache, try to get from GitHub
              const repoName = file.path.split('/')[1];

              if (repoName && selectedRepo) {
                // Prepare GitHub path (without leading slash)
                const githubPath = file.githubPath || file.path.substring(repoName.length + 2);

                try {
                  // Call GitHub API to get file content
                  const content = await githubService.getFileContent(
                    selectedRepo.owner.login,
                    selectedRepo.name,
                    githubPath,
                    currentBranch || 'main'
                  );

                  // Cache the content
                  localStorage.setItem(`file-content-${file.path}`, content);

                  // Update file node with content
                  const updatedFile = {
                    ...file,
                    content
                  };

                  // Update in file tree
                  const updateFileContent = (nodes: FileNode[]): FileNode[] => {
                    return nodes.map(node => {
                      if (node.id === file.id) {
                        return updatedFile;
                      } else if (node.children && node.children.length > 0) {
                        return {
                          ...node,
                          children: updateFileContent(node.children)
                        };
                      }
                      return node;
                    });
                  };

                  setFileTree(updateFileContent(fileTree));
                  setCurrentFile(updatedFile);

                  // Create a tab for the file
                  createTabForFile(updatedFile, content);
                } catch (error) {
                  console.error('Error loading file content from GitHub:', error);
                  setError('Failed to load file content. Please try again.');
                }
              }
            }
          } catch (error) {
            console.error('Error loading file content:', error);
            setError('Failed to load file content. Please try again.');
          } finally {
            setIsLoading(false);
          }
        } else {
          // File already has content, just create a tab
          createTabForFile(file, file.content || '');
        }
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      setError('Failed to select file. Please try again.');
    }
  };

  // Create a tab for a file so it appears in the editor
  const createTabForFile = (file: FileNode, content: string) => {
    // Check if a tab for this file already exists
    const existingTab = tabs.find(tab => tab.path === file.path);

    if (existingTab) {
      // Just activate the existing tab
      setActiveTab(existingTab.id);
      return;
    }

    // Get the file extension to determine language
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    let language = 'plaintext';

    // Determine language based on extension
    switch (extension) {
      case 'js': language = 'javascript'; break;
      case 'jsx': language = 'javascript'; break;
      case 'ts': language = 'typescript'; break;
      case 'tsx': language = 'typescript'; break;
      case 'html': language = 'html'; break;
      case 'css': language = 'css'; break;
      case 'json': language = 'json'; break;
      case 'md': language = 'markdown'; break;
      case 'py': language = 'python'; break;
      case 'java': language = 'java'; break;
      case 'c': language = 'c'; break;
      case 'cpp': language = 'cpp'; break;
      case 'cs': language = 'csharp'; break;
      case 'go': language = 'go'; break;
      case 'php': language = 'php'; break;
      case 'rb': language = 'ruby'; break;
      case 'rs': language = 'rust'; break;
      default: language = 'plaintext';
    }

    // Create a new tab
    const newTab: Tab = {
      id: `tab-${Date.now()}`,
      name: file.name,
      path: file.path,
      content: content,
      isDirty: false,
      language: language
    };

    // Add the tab and make it active
    addTab(newTab);
    setActiveTab(newTab.id);
  };

  // Handle clearing localStorage
  const handleClearStorage = () => {
    if (confirm('Are you sure you want to clear all stored data? This will remove all GitHub repositories and their file structures.')) {
      localStorage.clear();
      setFileTree([]);
      setCurrentProject(null);
      setError(null);
      console.log('All storage cleared');
    }
  };

  // Handle file delete confirmation
  const handleDeleteConfirm = async () => {
    if (fileToDelete) {
      const success = await deleteFile(fileToDelete)
      if (success) {
        console.log(`File deleted: ${fileToDelete}`)
        // Silinen dosya için açık tab varsa kapat
        const tabToClose = tabs.find(tab => tab.path === fileToDelete)
        if (tabToClose) {
          // TODO: Implement tab closing functionality
        }
      } else {
        setError(`Dosya silinemedi: ${fileToDelete}`)
      }
      setFileToDelete(null)
    }
  }

  // Handle GitHub push
  const handlePushToGitHub = async () => {
    if (!selectedRepo || !currentBranch) {
      setError('GitHub reposu ve branch seçilmemiş. Lütfen önce GitHub panelinden bir repo ve branch seçin.');
      return;
    }

    if (!commitMessage.trim()) {
      setError('Commit mesajı boş olamaz.');
      return;
    }

    setIsPushing(true);
    try {
      // Değişiklikleri takip etmek için
      const filesToPush = tabs
        .filter(tab => tab.isDirty && tab.path.startsWith('/'))
        .map(tab => ({
          path: tab.path.replace(`/${selectedRepo.name}/`, ''), // GitHub API için yolu düzelt
          content: tab.content,
        }));

      if (filesToPush.length === 0) {
        setError('Değişiklik yapılmış dosya bulunamadı.');
        setIsPushing(false);
        return;
      }

      // GitHub servisinden pushChanges metodunu çağır
      const result = await githubService.pushChanges(
        selectedRepo.owner.login,
        selectedRepo.name,
        filesToPush,
        currentBranch,
        commitMessage
      );

      if (result.success) {
        // Başarılı push sonrası, dirty flag'leri temizle
        const updatedTabs = tabs.map(tab => {
          if (filesToPush.some(file => tab.path.endsWith(file.path))) {
            return { ...tab, isDirty: false };
          }
          return tab;
        });

        // TODO: Store'da tabs güncelleme metodu eklenirse kullan

        setError(null);
        setShowPushDialog(false);
        alert(`GitHub'a başarıyla push edildi! ${result.message}`);
      } else {
        setError(`Push hatası: ${result.message}`);
      }
    } catch (error) {
      console.error('Push error:', error);
      setError(`Push sırasında bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setIsPushing(false);
    }
  };

  // Yeni dosya oluşturma
  const handleCreateNewFile = () => {
    if (!newFileName.trim()) {
      setError('Dosya adı boş olamaz');
      return;
    }

    try {
      // Eğer bir klasör seçilmişse o klasöre, yoksa kök dizine ekle
      const basePath = selectedFolderPath || (fileTree.length > 0 ? fileTree[0].path : '/');

      // Yeni dosya için ID oluştur
      const newFileId = `file-${Date.now()}`;

      // Dosya yolu oluştur
      const newFilePath = `${basePath}${basePath.endsWith('/') ? '' : '/'}${newFileName}`;

      // Yeni dosya nesnesi oluştur
      const newFile: FileNode = {
        id: newFileId,
        name: newFileName,
        type: 'file',
        path: newFilePath,
        content: '',
      };

      // Dosyayı fileTree'ye ekle
      if (selectedFolderPath) {
        // Seçili klasöre ekle
        const updateTree = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(node => {
            if (node.path === selectedFolderPath) {
              // Klasöre ekle
              return {
                ...node,
                children: [...(node.children || []), newFile],
                isExpanded: true
              };
            } else if (node.children) {
              // Alt klasörlerde ara
              return {
                ...node,
                children: updateTree(node.children)
              };
            }
            return node;
          });
        };

        setFileTree(updateTree(fileTree));
      } else {
        // Kök dizine ekle (yalnızca GitHub repo için)
        if (fileTree.length > 0 && fileTree[0].type === 'folder') {
          const rootFolder = fileTree[0];
          setFileTree([{
            ...rootFolder,
            children: [...(rootFolder.children || []), newFile]
          }]);
        } else {
          // Dosya ağacı yoksa hata ver
          setError('Dosya eklemek için geçerli bir klasör yapısı bulunamadı');
          return;
        }
      }

      // Başarılı mesajı
      console.log(`Yeni dosya oluşturuldu: ${newFilePath}`);

      // Yeni oluşturulan dosyayı editörde aç
      createTabForFile(newFile, '');

      // Dialog'u kapat ve formu temizle
      setShowNewFileDialog(false);
      setNewFileName('');
      setSelectedFolderPath(null);
    } catch (err) {
      console.error('Dosya oluşturma hatası:', err);
      setError(`Dosya oluşturulamadı: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
    }
  };

  // Yeni klasör oluşturma
  const handleCreateNewFolder = () => {
    if (!newFolderName.trim()) {
      setError('Klasör adı boş olamaz');
      return;
    }

    try {
      // Eğer bir klasör seçilmişse o klasöre, yoksa kök dizine ekle
      const basePath = selectedFolderPath || (fileTree.length > 0 ? fileTree[0].path : '/');

      // Yeni klasör için ID oluştur
      const newFolderId = `folder-${Date.now()}`;

      // Klasör yolu oluştur
      const newFolderPath = `${basePath}${basePath.endsWith('/') ? '' : '/'}${newFolderName}`;

      // Yeni klasör nesnesi oluştur
      const newFolder: FileNode = {
        id: newFolderId,
        name: newFolderName,
        type: 'folder',
        path: newFolderPath,
        children: [],
        isExpanded: true
      };

      // Klasörü fileTree'ye ekle
      if (selectedFolderPath) {
        // Seçili klasöre ekle
        const updateTree = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(node => {
            if (node.path === selectedFolderPath) {
              // Klasöre ekle
              return {
                ...node,
                children: [...(node.children || []), newFolder],
                isExpanded: true
              };
            } else if (node.children) {
              // Alt klasörlerde ara
              return {
                ...node,
                children: updateTree(node.children)
              };
            }
            return node;
          });
        };

        setFileTree(updateTree(fileTree));
      } else {
        // Kök dizine ekle (yalnızca GitHub repo için)
        if (fileTree.length > 0 && fileTree[0].type === 'folder') {
          const rootFolder = fileTree[0];
          setFileTree([{
            ...rootFolder,
            children: [...(rootFolder.children || []), newFolder]
          }]);
        } else {
          // Dosya ağacı yoksa hata ver
          setError('Klasör eklemek için geçerli bir klasör yapısı bulunamadı');
          return;
        }
      }

      // Başarılı mesajı
      console.log(`Yeni klasör oluşturuldu: ${newFolderPath}`);

      // Dialog'u kapat ve formu temizle
      setShowNewFolderDialog(false);
      setNewFolderName('');
      setSelectedFolderPath(null);
    } catch (err) {
      console.error('Klasör oluşturma hatası:', err);
      setError(`Klasör oluşturulamadı: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
    }
  };

  // Klasör seçme
  const handleSelectFolder = (folderPath: string) => {
    setSelectedFolderPath(folderPath);
  };

  useEffect(() => {
    // Update IDE store with the error setter function
    useIDEStore.setState({
      setError: (msg: string | null) => {
        setError(msg)
        return // void döndüğünden emin olalım
      }
    })
  }, [])

  // Context Provider değerleri
  const explorerContextValue = {
    setShowNewFileDialog,
    setShowNewFolderDialog,
    setSelectedFolderPath
  }

  return (
    <FileExplorerContext.Provider value={explorerContextValue}>
      <div className="h-full flex flex-col overflow-hidden border-r border-gray-800">
        <div className="flex justify-between items-center p-2 border-b border-gray-800">
          <span className="text-sm font-medium">EXPLORER</span>
          <div className="flex gap-1">
            {/* Add Button */}
            <DropdownMenu open={showAddMenu} onOpenChange={setShowAddMenu}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 text-blue-500 hover:bg-blue-500/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setShowNewFileDialog(true);
                  setShowAddMenu(false);
                }}>
                  <FileText className="h-4 w-4 mr-2" />
                  <span>Yeni Dosya</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setShowNewFolderDialog(true);
                  setShowAddMenu(false);
                }}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  <span>Yeni Klasör</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Toggle Local Files */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowLocalFiles(!showLocalFiles)}
                    className="h-6 w-6"
                  >
                    {showLocalFiles
                      ? <EyeOff className="h-3.5 w-3.5" />
                      : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showLocalFiles ? "Yerel Dosyaları Gizle" : "Yerel Dosyaları Göster"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Clear Storage */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleClearStorage}
                    className="h-6 w-6 text-destructive hover:bg-destructive/10"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Tüm Verileri Temizle
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Display warning if empty */}
        {fileTree.length === 0 && !isLoading && (
          <div className="p-2 text-sm text-muted-foreground">
            <div className="bg-amber-950/30 border border-amber-800/50 p-2 mb-2 rounded">
              <AlertTriangle size={16} className="inline-block mr-1 text-amber-500" />
              <span className="text-amber-300 text-xs">Dikkat</span>
              <p className="text-xs mt-1">
                Çalışmanız bittiğinde projenizin yedeğini alın. Dosyalarınız tarayıcı kapandığında kaybolabilir.
              </p>
            </div>

            <div className="flex flex-col gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                className="justify-start"
                onClick={() => togglePanel('github')}
              >
                <Github className="mr-1 h-3.5 w-3.5" />
                Yükle GitHub Projesi
              </Button>

              {!showLocalFiles && (
                <Button
                  size="sm"
                  variant="outline"
                  className="justify-start"
                  onClick={() => setShowLocalFiles(true)}
                >
                  <Folder className="mr-1 h-3.5 w-3.5" />
                  Yerel Dosyaları Göster
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Show file tree or loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner className="text-primary h-6 w-6" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            {fileTree.map((node) => (
              <FileTreeItem
                key={node.id}
                node={node}
                depth={0}
                onFileSelect={onFileSelect}
                onToggleExpand={handleToggleExpand}
              />
            ))}
          </div>
        )}

        {/* Display error message if any */}
        {error && (
          <div className="p-2 text-xs text-red-500 border-t border-gray-800">
            {error}
          </div>
        )}

        {/* Delete confirmation dialog */}
        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="Dosyayı Sil"
          description={`"${fileToDelete?.split('/').pop()}" dosyasını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
          actionLabel="Sil"
          cancelLabel="İptal"
          onConfirm={handleDeleteConfirm}
        />

        {/* New File Dialog */}
        <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Dosya Oluştur</DialogTitle>
              <DialogDescription>
                Oluşturmak istediğiniz dosyanın adını girin.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="file-name">Dosya Adı</Label>
                <Input
                  id="file-name"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="örn: index.js"
                />
              </div>

              <div className="space-y-2">
                <Label>Konum</Label>
                <div className="text-sm border rounded p-2">
                  {selectedFolderPath || 'Kök dizin'}
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setShowNewFileDialog(false)}>
                İptal
              </Button>
              <Button
                onClick={handleCreateNewFile}
                disabled={!newFileName.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Oluştur
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Folder Dialog */}
        <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Klasör Oluştur</DialogTitle>
              <DialogDescription>
                Oluşturmak istediğiniz klasörün adını girin.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="folder-name">Klasör Adı</Label>
                <Input
                  id="folder-name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="örn: components"
                />
              </div>

              <div className="space-y-2">
                <Label>Konum</Label>
                <div className="text-sm border rounded p-2">
                  {selectedFolderPath || 'Kök dizin'}
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
                İptal
              </Button>
              <Button
                onClick={handleCreateNewFolder}
                disabled={!newFolderName.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Oluştur
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FileExplorerContext.Provider>
  );
}

