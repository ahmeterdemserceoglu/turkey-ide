"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Settings,
  Sun,
  Moon,
  Files,
  Terminal as TerminalIcon,
  Bot,
  Github,
  Menu,
  Maximize2,
  Minimize2,
  TerminalSquare,
  Upload,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useIDEStore } from "@/store/ide-store";
import { useGitHubStore } from "@/store/github-store";
import { githubService } from "@/services/github-service";
import { FileExplorer } from "@/components/explorer/file-explorer";
import { MonacoEditor } from "@/components/editor/monaco-editor";
import { TabBar } from "@/components/editor/tab-bar";
import { GitHubPanel } from "@/components/github/github-panel";
import { AdvancedAIAssistant } from "@/components/ai/advanced-ai-assistant";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { FileMenu } from "./menu/file-menu";
import { EditMenu } from "./menu/edit-menu";
import { ViewMenu } from "./menu/view-menu";
import { TerminalMenu } from "./menu/terminal-menu";
import { HelpMenu } from "./menu/help-menu";
import { getCurrentProject, getProjectFileTree } from "@/lib/local-storage";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangle } from "lucide-react";

// Dynamically import the Terminal component with SSR disabled
const Terminal = dynamic(
  () => import("@/components/terminal/terminal").then((mod) => mod.Terminal),
  {
    ssr: false,
  },
);

// Dynamically import the LinuxTerminal component
const LinuxTerminal = dynamic(
  () =>
    import("@/components/terminal/linux-terminal").then(
      (mod) => mod.LinuxTerminal,
    ),
  {
    ssr: false,
  },
);

// Dynamically import the IntegratedTerminal component
const IntegratedTerminal = dynamic(
  () =>
    import("@/components/terminal/integrated-terminal").then(
      (mod) => mod.IntegratedTerminal,
    ),
  {
    ssr: false,
  },
);

export function IDELayout() {
  const {
    theme,
    setTheme,
    panels,
    togglePanel,
    sidebarWidth,
    setSidebarWidth,
    terminalHeight,
    setTerminalHeight,
    addTab,
    tabs,
    activeTabId,
    setCurrentProject,
    setFileTree,
    markTabsAsSaved,
  } = useIDEStore();

  const {
    token,
    user,
    isAuthenticated,
    repositories,
    selectedRepo,
    currentBranch,
    branches,
    setSelectedRepo,
    setBranches,
    setCurrentBranch,
    setRepositories,
  } = useGitHubStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [pushError, setPushError] = useState<string | null>(null);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  // Get the active tab to display its language in the status bar
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const activeLanguage = activeTab?.language || "plaintext";

  // Format the language name to be more user-friendly
  const formatLanguage = (language: string) => {
    switch (language) {
      case "javascript":
        return "JavaScript";
      case "typescript":
        return "TypeScript";
      case "html":
        return "HTML";
      case "css":
        return "CSS";
      case "json":
        return "JSON";
      case "markdown":
        return "Markdown";
      case "python":
        return "Python";
      case "java":
        return "Java";
      case "cpp":
        return "C++";
      case "c":
        return "C";
      case "csharp":
        return "C#";
      case "go":
        return "Go";
      case "rust":
        return "Rust";
      case "shell":
        return "Shell";
      case "sql":
        return "SQL";
      case "xml":
        return "XML";
      case "yaml":
        return "YAML";
      case "plaintext":
        return "Plain Text";
      default:
        return language.charAt(0).toUpperCase() + language.slice(1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle GitHub login
  const handleGitHubLogin = () => {
    // Redirect to GitHub OAuth endpoint
    window.location.href = githubService.getAuthUrl();
  };

  // Load user repositories
  const loadRepositories = async () => {
    if (!token) return;

    setIsLoadingRepos(true);
    try {
      const repos = await githubService.getUserRepositories();
      setRepositories(repos);
    } catch (error) {
      console.error("Error loading repositories:", error);
      setPushError("GitHub repo yüklenirken hata oluştu.");
    } finally {
      setIsLoadingRepos(false);
    }
  };

  // Load repository branches
  const loadBranches = async (repoFullName: string) => {
    if (!token) return;

    setIsLoadingBranches(true);
    try {
      const [owner, repoName] = repoFullName.split("/");
      const branchList = await githubService.getBranches(owner, repoName);
      setBranches(branchList);

      // Set default branch as current if not already set
      if (!currentBranch) {
        const repo = repositories.find((r) => r.full_name === repoFullName);
        if (repo) {
          setCurrentBranch(repo.default_branch);
        }
      }
    } catch (error) {
      console.error("Error loading branches:", error);
      setPushError("Branch bilgileri yüklenirken hata oluştu.");
    } finally {
      setIsLoadingBranches(false);
    }
  };

  // Handle repository selection
  const handleRepoSelect = (repoFullName: string) => {
    const repo = repositories.find((r) => r.full_name === repoFullName);
    if (repo) {
      setSelectedRepo(repo);
      loadBranches(repoFullName);
    }
  };

  // Load repositories when dialog opens if user is authenticated
  useEffect(() => {
    if (showPushDialog && token && !repositories.length) {
      loadRepositories();
    }
  }, [showPushDialog, token, repositories.length]);

  // Handle GitHub push
  const handlePushToGitHub = async () => {
    if (!selectedRepo || !currentBranch) {
      setPushError(
        "GitHub reposu ve branch seçilmemiş. Lütfen önce GitHub panelinden bir repo ve branch seçin.",
      );
      return;
    }

    if (!commitMessage.trim()) {
      setPushError("Commit mesajı boş olamaz.");
      return;
    }

    setIsPushing(true);
    setPushError(null);

    try {
      // Tüm açık dosyaları push et - değişiklik kontrolü yapma
      const filesToPush = tabs.map((tab) => {
        // Dosya yolunu GitHub API için düzenle
        let path = tab.path;
        if (selectedRepo && path.includes(`/${selectedRepo.name}/`)) {
          path = path.replace(`/${selectedRepo.name}/`, "");
        } else if (path.startsWith("/")) {
          // Path starts with / but doesn't have repo name
          const pathParts = path.split("/").filter(Boolean);
          if (pathParts.length > 0) {
            // Remove the first segment (which might be the repo name)
            pathParts.shift();
            path = pathParts.join("/");
          }
        }

        return {
          path,
          content: tab.content,
        };
      });

      console.log("Files to push:", filesToPush);

      // GitHub servisinden pushChanges metodunu çağır
      const result = await githubService.pushChanges(
        selectedRepo.owner.login,
        selectedRepo.name,
        filesToPush,
        currentBranch,
        commitMessage,
      );

      if (result.success) {
        // Tüm tabları kaydetmiş olarak işaretle
        const allTabIds = tabs.map((tab) => tab.id);
        markTabsAsSaved(allTabIds);

        setPushError(null);
        setShowPushDialog(false);

        // Başarı mesajı
        alert(`GitHub'a başarıyla push edildi!`);
      } else {
        setPushError(`Push hatası: ${result.message}`);
      }
    } catch (error) {
      console.error("Push error:", error);
      setPushError(
        `Push sırasında bir hata oluştu: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
      );
    } finally {
      setIsPushing(false);
    }
  };

  // Sayfa yüklendiğinde mevcut projeyi kontrol et
  useEffect(() => {
    // İlk başlangıçta mevcut projeyi ve dosya ağacını yükle
    const loadCurrentProject = async () => {
      try {
        console.log("IDE Başlangıç: Aktif projeyi yükleme işlemi başlıyor...");

        // Mevcut projeyi al
        const currentProject = getCurrentProject();
        console.log("IDE Başlangıç: Current project:", currentProject);

        if (currentProject) {
          // IDE store'a projeyi set et
          setCurrentProject(currentProject);

          // Dosya ağacını yükleme
          let isFileTreeLoaded = false;

          // 1. Enhanced storage'dan kontrol et (project-ID-structure) - En güvenilir kaynak
          try {
            const projectStructure = localStorage.getItem(
              `project-${currentProject.id}-structure`,
            );
            if (projectStructure) {
              console.log(
                "IDE Başlangıç: Enhanced storage - Project structure found",
              );
              const parsedStructure = JSON.parse(projectStructure);
              setFileTree([parsedStructure]);
              isFileTreeLoaded = true;
            }
          } catch (error) {
            console.error(
              "IDE Başlangıç: Error loading project from enhanced storage",
              error,
            );
          }

          // 2. Normal localStorage'dan kontrol et (eski yöntem)
          if (
            !isFileTreeLoaded &&
            currentProject.path.startsWith("/projects/")
          ) {
            const fileTree = getProjectFileTree(currentProject.id);
            if (fileTree && fileTree.length > 0) {
              console.log(
                "IDE Başlangıç: Normal storage - Project file tree loaded",
              );
              setFileTree(fileTree);
              isFileTreeLoaded = true;
            }
          }

          // 3. GitHub repo storage'dan kontrol et (github-repo-NAME-structure)
          if (!isFileTreeLoaded && currentProject.path.startsWith("/")) {
            try {
              // GitHub repo ismini çıkar
              const repoName = currentProject.path.split("/")[1]; // '/repo-name' formatından repo adını al
              if (repoName) {
                console.log(
                  "IDE Başlangıç: Checking GitHub repo structure for",
                  repoName,
                );

                const repoStructure = localStorage.getItem(
                  `github-repo-${repoName}-structure`,
                );
                if (repoStructure) {
                  console.log(
                    "IDE Başlangıç: GitHub storage - Repo structure found",
                  );
                  const parsedStructure = JSON.parse(repoStructure);
                  setFileTree([parsedStructure]);
                  isFileTreeLoaded = true;
                }
              }
            } catch (error) {
              console.error(
                "IDE Başlangıç: Error loading GitHub project structure",
                error,
              );
            }
          }

          // 4. Hiçbir yerden yüklenemezse uyarı ver
          if (!isFileTreeLoaded) {
            console.warn(
              "⚠️ IDE Başlangıç: Could not find file tree for project:",
              currentProject.name,
            );
          } else {
            console.log(
              "✅ IDE Başlangıç: Project loaded successfully:",
              currentProject.name,
            );
          }

          // Explorer panelini otomatik olarak aç
          if (!panels.explorer.isVisible) {
            togglePanel("explorer");
          }
        }
        // Eğer aktif proje yoksa, stored-projects'den son erişilen projeyi bulmaya çalış
        else {
          try {
            console.log(
              "IDE Başlangıç: Aktif proje bulunamadı, son kullanılan proje aranıyor...",
            );
            const storedProjects = JSON.parse(
              localStorage.getItem("stored-projects") || "[]",
            );
            if (storedProjects.length > 0) {
              // Son erişilen projeyi bul
              const sortedProjects = [...storedProjects].sort((a, b) => {
                return (
                  new Date(b.lastAccessed).getTime() -
                  new Date(a.lastAccessed).getTime()
                );
              });

              const lastProject = sortedProjects[0];
              console.log(
                "IDE Başlangıç: Son kullanılan proje bulundu:",
                lastProject,
              );

              if (lastProject) {
                // Projeyi yükle
                setCurrentProject(lastProject);

                // Dosya yapısını yükle
                let fileTreeLoaded = false;

                // 1. Enhanced storage'dan kontrol et
                const projectStructure = localStorage.getItem(
                  `project-${lastProject.id}-structure`,
                );
                if (projectStructure) {
                  console.log(
                    "IDE Başlangıç: Son kullanılan proje için enhanced storage'dan yapı bulundu",
                  );
                  const parsedStructure = JSON.parse(projectStructure);
                  setFileTree([parsedStructure]);
                  fileTreeLoaded = true;
                }

                // 2. Normal localStorage'dan kontrol et
                if (
                  !fileTreeLoaded &&
                  lastProject.path.startsWith("/projects/")
                ) {
                  const fileTree = getProjectFileTree(lastProject.id);
                  if (fileTree && fileTree.length > 0) {
                    console.log(
                      "IDE Başlangıç: Son kullanılan proje için normal storage'dan yapı bulundu",
                    );
                    setFileTree(fileTree);
                    fileTreeLoaded = true;
                  }
                }

                // 3. GitHub repo storage'dan kontrol et
                if (!fileTreeLoaded && lastProject.path.startsWith("/")) {
                  try {
                    const repoName = lastProject.path.split("/")[1];
                    if (repoName) {
                      const repoStructure = localStorage.getItem(
                        `github-repo-${repoName}-structure`,
                      );
                      if (repoStructure) {
                        console.log(
                          "IDE Başlangıç: Son kullanılan proje için GitHub storage'dan yapı bulundu",
                        );
                        const parsedStructure = JSON.parse(repoStructure);
                        setFileTree([parsedStructure]);
                        fileTreeLoaded = true;
                      }
                    }
                  } catch (error) {
                    console.error(
                      "IDE Başlangıç: Son kullanılan proje için GitHub yapısı yüklenemedi",
                      error,
                    );
                  }
                }

                // Explorer panelini aç
                if (fileTreeLoaded && !panels.explorer.isVisible) {
                  togglePanel("explorer");
                }
              }
            } else {
              console.log("IDE Başlangıç: Kayıtlı proje bulunamadı");
            }
          } catch (error) {
            console.error(
              "IDE Başlangıç: Error loading stored projects",
              error,
            );
          }
        }
      } catch (error) {
        console.error("IDE Başlangıç: Genel bir hata oluştu", error);
      }
    };

    // Sayfa ilk yüklendiğinde çalışacak
    loadCurrentProject();
  }, []);

  return (
    <TooltipProvider>
      <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
        {/* Top Menu Bar */}
        <div className="flex items-center justify-between h-12 px-4 border-b bg-background">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <h1 className="text-lg font-bold">TurkeyIDE</h1>
            </div>

            <Separator orientation="vertical" className="h-6" />

            <FileMenu />
            <EditMenu />
            <ViewMenu />
            <TerminalMenu />
            <HelpMenu />
          </div>

          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {theme === "dark" ? "Açık tema" : "Koyu tema"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tam ekran</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPushDialog(true)}
                  disabled={!selectedRepo || isPushing}
                  className={
                    selectedRepo ? "text-green-500 hover:text-green-600" : ""
                  }
                >
                  {isPushing ? (
                    <Spinner className="w-4 h-4" />
                  ) : (
                    <Github className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>GitHub Push</TooltipContent>
            </Tooltip>

            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Activity Bar */}
          <div className="w-12 bg-accent/50 border-r flex flex-col">
            <div className="flex-1 flex flex-col py-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={panels.explorer.isVisible ? "default" : "ghost"}
                    size="sm"
                    className="w-10 h-10 mb-2 mx-1"
                    onClick={() => togglePanel("explorer")}
                  >
                    <Files className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Explorer</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={panels.github.isVisible ? "default" : "ghost"}
                    size="sm"
                    className="w-10 h-10 mb-2 mx-1"
                    onClick={() => togglePanel("github")}
                  >
                    <Github className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">GitHub</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={panels.ai.isVisible ? "default" : "ghost"}
                    size="sm"
                    className="w-10 h-10 mb-2 mx-1"
                    onClick={() => togglePanel("ai")}
                  >
                    <Bot className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">AI Assistant</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex flex-col">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={panels.terminal.isVisible ? "default" : "ghost"}
                    size="sm"
                    className="w-10 h-10 mb-2 mx-1"
                    onClick={() => togglePanel("terminal")}
                  >
                    <TerminalIcon className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Terminal</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild></TooltipTrigger>
                <TooltipContent side="right">Linux Terminal</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Content Area */}
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* Sidebar - Left side panels (Explorer and GitHub) */}
            {(panels.explorer.isVisible || panels.github.isVisible) && (
              <>
                <ResizablePanel
                  defaultSize={25}
                  minSize={15}
                  maxSize={40}
                  onResize={(size) =>
                    setSidebarWidth((size / 100) * window.innerWidth)
                  }
                >
                  <div className="h-full">
                    {panels.github.isVisible && <GitHubPanel />}
                    {panels.explorer.isVisible && !panels.github.isVisible && (
                      <FileExplorer />
                    )}
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            {/* Editor Area */}
            <ResizablePanel defaultSize={panels.terminal.isVisible ? 75 : 100}>
              <ResizablePanelGroup direction="vertical">
                <ResizablePanel
                  defaultSize={panels.terminal.isVisible ? 70 : 100}
                  style={{
                    height: panels.terminal.isVisible
                      ? "calc(70vh)"
                      : "calc(100vh - 78px)",
                  }}
                >
                  <div className="h-full flex flex-col overflow-hidden">
                    <TabBar />
                    <div className="flex-1 h-full overflow-hidden">
                      <MonacoEditor className="w-full h-full" />
                    </div>
                  </div>
                </ResizablePanel>

                {/* Terminal Panel */}
                {panels.terminal.isVisible && (
                  <>
                    <ResizableHandle withHandle />
                    <ResizablePanel
                      defaultSize={30}
                      minSize={15}
                      maxSize={50}
                      onResize={(size) =>
                        setTerminalHeight((size / 100) * window.innerHeight)
                      }
                    >
                      <div className="h-full bg-background border-t">
                        <IntegratedTerminal />
                      </div>
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </ResizablePanel>

            {/* Right Sidebar - AI Assistant */}
            {panels.ai.isVisible && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
                  <div className="h-full border-l">
                    <AdvancedAIAssistant />
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>

        {/* Status Bar */}
        <div className="h-6 bg-accent/30 border-t flex items-center justify-between px-4 text-xs">
          <div className="flex items-center space-x-4">
            <span>TurkeyIDE v1.0.0</span>
            <span>•</span>
            <span>UTF-8</span>
            <span>•</span>
            <span>{formatLanguage(activeLanguage)}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Ln 1, Col 1</span>
            <span>•</span>
            <span>Spaces: 2</span>
          </div>
        </div>

        {/* GitHub Push Dialog */}
        <Dialog open={showPushDialog} onOpenChange={setShowPushDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>GitHub'a Push</DialogTitle>
              <DialogDescription>
                Değişikliklerinizi GitHub'a göndermek için commit mesajı girin.
              </DialogDescription>
            </DialogHeader>

            {!token ? (
              <div className="flex flex-col items-center py-4">
                <Github className="h-10 w-10 mb-4 text-muted-foreground" />
                <p className="text-center mb-4">
                  GitHub hesabınıza giriş yapmanız gerekiyor.
                </p>
                <Button
                  onClick={handleGitHubLogin}
                  className="bg-[#2da44e] hover:bg-[#2c974b]"
                >
                  <Github className="mr-2 h-4 w-4" />
                  GitHub ile Giriş Yap
                </Button>
              </div>
            ) : (
              <>
                {!isLoadingRepos && repositories.length > 0 ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="repo-select">Repository</Label>
                      <Select
                        value={selectedRepo?.full_name}
                        onValueChange={handleRepoSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Repository seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {repositories.map((repo) => (
                            <SelectItem key={repo.id} value={repo.full_name}>
                              {repo.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedRepo && branches.length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="branch-select">Branch</Label>
                        <Select
                          value={currentBranch || ""}
                          onValueChange={setCurrentBranch}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Branch seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map((branch) => (
                              <SelectItem key={branch.name} value={branch.name}>
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {selectedRepo && currentBranch && (
                      <div className="space-y-2">
                        <Label htmlFor="commit-message">Commit Mesajı</Label>
                        <Input
                          id="commit-message"
                          value={commitMessage}
                          onChange={(e) => setCommitMessage(e.target.value)}
                          placeholder="Değişikliklerinizi açıklayın..."
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4">
                    {isLoadingRepos ? (
                      <div className="flex flex-col items-center">
                        <Spinner className="h-8 w-8 mb-2" />
                        <p>Repolar yükleniyor...</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="mb-2">GitHub reposu bulunamadı.</p>
                        <Button size="sm" onClick={loadRepositories}>
                          Yenile
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {pushError && (
              <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-800 dark:text-red-300">
                {pushError}
              </div>
            )}

            <DialogFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setShowPushDialog(false)}
              >
                İptal
              </Button>
              <Button
                onClick={handlePushToGitHub}
                disabled={
                  !token ||
                  !selectedRepo ||
                  !currentBranch ||
                  !commitMessage.trim() ||
                  isPushing
                }
                className="bg-green-600 hover:bg-green-700"
              >
                {isPushing ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Push Yapılıyor...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Push
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
