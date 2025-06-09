'use client';

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  content?: string
  githubPath?: string // Path specific to GitHub API
  children?: FileNode[]
  isExpanded?: boolean
}

export type TabType =
  | 'editor'
  | 'terminal'
  | 'github'
  | 'linux-terminal'
  | 'code'
  | 'image'
  | 'text'
  | 'unknown'

export interface Tab {
  id: string
  name: string
  path: string
  content: string
  isDirty: boolean
  language: string
  type?: TabType
}

export interface Panel {
  id: string
  title: string
  isVisible: boolean
  width: number
}

export type TerminalType = 'cmd' | 'powershell' | 'bash'
export type SplitDirection = 'horizontal' | 'vertical' | 'none'

export interface TerminalSplit {
  id: string
  direction: SplitDirection
  terminals: string[] // terminal ID'leri
  sizes: number[] // split boyutları (percentage)
}

export interface TerminalInstance {
  id: string
  name: string
  type: TerminalType
  createdAt: number
  workingDirectory?: string
  projectName?: string
  projectType?: 'nodejs' | 'python' | 'react' | 'nextjs' | 'vue' | 'angular' | 'generic'
  isProjectTerminal?: boolean
  splitId?: string // hangi split grubuna ait olduğu
  projectSetupComplete?: boolean // Proje kurulumunun tamamlanıp tamamlanmadığı
}

export interface Project {
  id: string;
  name: string
  path: string
  type: string
  framework?: string
  frameworkName?: string
  lastOpened?: number
}

// Project creation progress tracking
export interface ProjectCreationProgress {
  step: string;
  progress: number;
  stepDescription: string;
  detail: string;
  isComplete: boolean;
}

// Add this interface before the IDEState interface
export interface ProjectTerminalCommands {
  projectPath: string;
  commands: string[];
}

interface IDEState {
  // File System
  fileTree: FileNode[]
  currentFile: FileNode | null
  showLocalFiles: boolean  // New property to control local file visibility

  // Tabs
  tabs: Tab[]
  activeTabId: string | null

  // Panels
  panels: {
    explorer: Panel
    terminal: Panel
    ai: Panel
    github: Panel
  }

  // Terminal
  terminalType: TerminalType
  terminals: TerminalInstance[]
  activeTerminalId: string | null
  terminalSplits: TerminalSplit[]
  activeSplitId: string | null
  projectTerminalCommands: ProjectTerminalCommands[] // New property for project terminal commands

  // UI State
  theme: 'light' | 'dark'
  sidebarWidth: number
  terminalHeight: number
  terminalCwd: string

  // GitHub
  isGithubConnected: boolean
  currentRepo: string | null
  currentBranch: string | null

  // AI
  isAIEnabled: boolean
  aiSuggestions: string[]

  // Directory Management
  directoryHistory: string[]
  favoriteDirectories: string[]
  currentProject: Project | null

  // Archived Projects (Raf)
  archivedProjects: Project[]
  showProjectShelvingMessage: boolean

  // Project Creation Progress
  projectCreationProgress: ProjectCreationProgress | null

  // File Management
  fileToDelete: string | null
  showDeleteDialog: boolean

  // Actions
  setFileTree: (tree: FileNode[]) => void
  setCurrentFile: (file: FileNode | null) => void
  setShowLocalFiles: (show: boolean) => void  // New action to toggle local files visibility
  addTab: (tab: Tab) => void
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateTabContent: (tabId: string, content: string) => void
  markTabAsSaved: (tabId: string) => void
  markTabsAsSaved: (tabIds: string[]) => void
  togglePanel: (panelId: keyof IDEState['panels']) => void
  setPanelWidth: (panelId: keyof IDEState['panels'], width: number) => void
  setTheme: (theme: 'light' | 'dark') => void
  setSidebarWidth: (width: number) => void
  setTerminalHeight: (height: number) => void
  setTerminalCwd: (path: string) => void
  setGithubConnection: (connected: boolean, repo?: string, branch?: string) => void
  setAIEnabled: (enabled: boolean) => void
  addAISuggestion: (suggestion: string) => void
  setTerminalType: (type: TerminalType) => void

  // Project Management
  setCurrentProject: (project: Project | null) => void
  archiveCurrentProject: () => void
  unarchiveProject: (projectPath: string) => void
  showProjectArchiveMessage: (show: boolean) => void
  getArchivedProjects: () => Project[]
  updateProjectCreationProgress: (progress: ProjectCreationProgress | null) => void

  // Yeni terminal işlemleri
  addTerminal: (type: TerminalType) => void
  removeTerminal: (id: string) => void
  setActiveTerminal: (id: string) => void
  renameTerminal: (id: string, name: string) => void

  // Proje bazlı terminal işlemleri
  addProjectTerminal: (projectPath: string, projectName: string, projectType?: string) => void
  updateTerminalWorkingDirectory: (id: string, path: string) => void
  getProjectTerminals: () => TerminalInstance[]
  detectProjectType: (path: string) => Promise<string>
  getRecentDirectories: () => string[]
  addToDirectoryHistory: (path: string) => void

  // Terminal split işlemleri
  createTerminalSplit: (direction: SplitDirection, terminalIds: string[]) => void
  splitTerminalHorizontal: (terminalId: string) => void
  splitTerminalVertical: (terminalId: string) => void
  closeSplit: (splitId: string) => void
  resizeSplit: (splitId: string, sizes: number[]) => void
  addTerminalToSplit: (splitId: string, terminalId: string) => void
  removeTerminalFromSplit: (splitId: string, terminalId: string) => void

  // Add the new function to the actions
  addProjectTerminalCommands: (projectPath: string, commands: string[]) => void
  getProjectTerminalCommands: (projectPath: string) => string[] | undefined

  // Add the terminal setup complete function
  setTerminalSetupComplete: (terminalId: string, isComplete: boolean) => void

  // File Management Actions
  setFileToDelete: (path: string | null) => void
  setShowDeleteDialog: (show: boolean) => void
  setError: (message: string | null) => void
  deleteFile: (path: string) => Promise<boolean>
}

// Check if code is running in browser environment
const isBrowser = typeof window !== 'undefined';

// Update the persistOptions storage to handle browser environment checks
const persistOptions = {
  name: 'turkish-ide-storage',
  // Use the default storage option which is appropriate for the environment
  partialize: (state: IDEState) => ({
    fileTree: state.fileTree,
    currentFile: state.currentFile,
    showLocalFiles: state.showLocalFiles,
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    panels: state.panels,
    theme: state.theme,
    sidebarWidth: state.sidebarWidth,
    terminalHeight: state.terminalHeight,
    terminalCwd: state.terminalCwd,
    isGithubConnected: state.isGithubConnected,
    currentRepo: state.currentRepo,
    currentBranch: state.currentBranch,
    directoryHistory: state.directoryHistory,
    favoriteDirectories: state.favoriteDirectories,
    currentProject: state.currentProject,
    archivedProjects: state.archivedProjects,
    projectCreationProgress: state.projectCreationProgress,
    projectTerminalCommands: state.projectTerminalCommands,
    fileToDelete: state.fileToDelete,
    showDeleteDialog: state.showDeleteDialog,
  }),
  // Add error handling for storage
  storage: {
    getItem: (name: string) => {
      try {
        if (!isBrowser) return null;
        const value = localStorage.getItem(name);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.warn('Error reading from localStorage:', error);
        return null;
      }
    },
    setItem: (name: string, value: unknown) => {
      try {
        if (!isBrowser) return;
        localStorage.setItem(name, JSON.stringify(value));
      } catch (error) {
        console.warn('Error writing to localStorage:', error,
          'This might be due to private browsing mode or storage quota limits.');
      }
    },
    removeItem: (name: string) => {
      try {
        if (!isBrowser) return;
        localStorage.removeItem(name);
      } catch (error) {
        console.warn('Error removing from localStorage:', error);
      }
    },
  },
}

export const useIDEStore = create<IDEState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        fileTree: [],
        currentFile: null,
        showLocalFiles: false,  // Default to not showing local files

        tabs: [],
        activeTabId: null,

        panels: {
          explorer: { id: 'explorer', title: 'Explorer', isVisible: true, width: 250 },
          terminal: { id: 'terminal', title: 'Terminal', isVisible: true, width: 300 },
          ai: { id: 'ai', title: 'AI', isVisible: false, width: 300 },
          github: { id: 'github', title: 'GitHub', isVisible: false, width: 300 }
        },

        theme: 'dark',
        sidebarWidth: 250,
        terminalHeight: 300,
        terminalCwd: '',

        isGithubConnected: false,
        currentRepo: null,
        currentBranch: null,

        isAIEnabled: false,
        aiSuggestions: [],

        directoryHistory: [],
        favoriteDirectories: [],
        currentProject: null,
        archivedProjects: [],
        showProjectShelvingMessage: true,

        projectCreationProgress: null,

        terminalType: 'cmd',
        terminals: [
          {
            id: 'terminal-1',
            name: 'Terminal 1',
            type: 'cmd',
            createdAt: Date.now()
          }
        ],
        activeTerminalId: 'terminal-1',
        terminalSplits: [],
        activeSplitId: null,

        projectTerminalCommands: [],

        // File Management
        fileToDelete: null,
        showDeleteDialog: false,

        // Actions
        setFileTree: (tree) => set({ fileTree: tree }),

        setCurrentFile: (file) => set({ currentFile: file }),

        setShowLocalFiles: (show) => set({ showLocalFiles: show }),  // New action to toggle local files visibility

        addTab: (tab) => set((state) => {
          // Check if a tab with the same path already exists
          const existingTab = state.tabs.find((t) => t.path === tab.path);
          if (existingTab) {
            // Update existing tab instead of adding a new one
            return {
              tabs: state.tabs.map((t) => (t.id === existingTab.id ? { ...t, content: tab.content } : t)),
              activeTabId: existingTab.id,
            };
          }

          // Add new tab
          return {
            tabs: [...state.tabs, tab],
            activeTabId: tab.id,
          };
        }),

        removeTab: (tabId) => set((state) => ({
          tabs: state.tabs.filter((tab) => tab.id !== tabId),
          activeTabId: state.activeTabId === tabId
            ? state.tabs.length > 1
              ? state.tabs[state.tabs.findIndex((tab) => tab.id === tabId) - 1]?.id || state.tabs[0].id
              : null
            : state.activeTabId,
        })),

        setActiveTab: (tabId) => set({ activeTabId: tabId }),

        updateTabContent: (tabId, content) => set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, content, isDirty: true } : tab
          ),
        })),

        markTabAsSaved: (tabId) => set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, isDirty: false } : tab
          ),
        })),

        markTabsAsSaved: (tabIds) => set((state) => ({
          tabs: state.tabs.map((tab) =>
            tabIds.includes(tab.id) ? { ...tab, isDirty: false } : tab
          ),
        })),

        togglePanel: (panelId) => set((state) => ({
          panels: {
            ...state.panels,
            [panelId]: {
              ...state.panels[panelId],
              isVisible: !state.panels[panelId].isVisible
            }
          }
        })),

        setPanelWidth: (panelId, width) => set((state) => ({
          panels: {
            ...state.panels,
            [panelId]: {
              ...state.panels[panelId],
              width
            }
          }
        })),

        setTheme: (theme) => set({ theme }),

        setSidebarWidth: (width) => set({ sidebarWidth: width }),

        setTerminalHeight: (height) => set({ terminalHeight: height }),

        setTerminalCwd: (path) => set({ terminalCwd: path }),

        setGithubConnection: (connected, repo, branch) => set({
          isGithubConnected: connected,
          currentRepo: repo || null,
          currentBranch: branch || null
        }),

        setAIEnabled: (enabled) => set({ isAIEnabled: enabled }),

        addAISuggestion: (suggestion) => set((state) => ({
          aiSuggestions: [...state.aiSuggestions, suggestion]
        })),

        setTerminalType: (type) => set({ terminalType: type }),

        // Yeni terminal işlemleri
        addTerminal: (type) => set((state) => {
          const terminalCount = state.terminals.length + 1
          const newTerminal: TerminalInstance = {
            id: `terminal-${Date.now()}`,
            name: `Terminal ${terminalCount}`,
            type,
            createdAt: Date.now()
          }
          return {
            terminals: [...state.terminals, newTerminal],
            activeTerminalId: newTerminal.id
          }
        }),

        removeTerminal: (id) => set((state) => {
          // En az bir terminal olmalı
          if (state.terminals.length <= 1) {
            return state
          }

          const newTerminals = state.terminals.filter(t => t.id !== id)
          const newActiveId = state.activeTerminalId === id
            ? newTerminals[0].id
            : state.activeTerminalId

          return {
            terminals: newTerminals,
            activeTerminalId: newActiveId
          }
        }),

        setActiveTerminal: (id) => set({ activeTerminalId: id }),

        renameTerminal: (id, name) => set((state) => ({
          terminals: state.terminals.map(term =>
            term.id === id
              ? { ...term, name }
              : term
          )
        })),

        // Proje bazlı terminal işlemleri
        addProjectTerminal: (projectPath, projectName, projectType = 'generic') => set((state) => {
          const terminalCount = state.terminals.length + 1
          const newTerminal: TerminalInstance = {
            id: `terminal-${Date.now()}`,
            name: `${projectName} Terminal`,
            type: 'cmd',
            createdAt: Date.now(),
            workingDirectory: projectPath,
            projectName,
            projectType: projectType as any,
            isProjectTerminal: true
          }
          return {
            terminals: [...state.terminals, newTerminal],
            activeTerminalId: newTerminal.id,
            terminalCwd: projectPath,
            currentProject: {
              id: `project-${Date.now()}`,
              name: projectName,
              path: projectPath,
              type: projectType
            }
          }
        }),

        updateTerminalWorkingDirectory: (id, path) => set((state) => ({
          terminals: state.terminals.map(term =>
            term.id === id
              ? { ...term, workingDirectory: path }
              : term
          ),
          terminalCwd: state.activeTerminalId === id ? path : state.terminalCwd,
          directoryHistory: state.directoryHistory.includes(path)
            ? state.directoryHistory
            : [...state.directoryHistory.slice(-9), path]
        })),

        getProjectTerminals: () => {
          const state = get()
          return state.terminals.filter(terminal => terminal.isProjectTerminal)
        },

        // Project Management Methods
        setCurrentProject: (project) => {
          // Update both store state and localStorage for consistency
          set({ currentProject: project });

          // Also update localStorage to keep compatibility with existing code
          try {
            if (project) {
              localStorage.setItem('currentProject', JSON.stringify(project));
            } else {
              localStorage.removeItem('currentProject');
            }
          } catch (error) {
            console.warn('Error syncing currentProject to localStorage:', error);
          }
        },

        archiveCurrentProject: () => set((state) => {
          // Check if there's a current project
          if (!state.currentProject) return {};

          try {
            // Add to archived projects
            const archivedProjects = [
              ...state.archivedProjects,
              {
                ...state.currentProject,
                lastOpened: Date.now()
              }
            ];

            return {
              currentProject: null,
              archivedProjects,
              showProjectShelvingMessage: true
            };
          } catch (error) {
            console.error('Error archiving project:', error);
            return {};
          }
        }),

        unarchiveProject: (projectPath) => set((state) => {
          try {
            // Find the project in archived projects
            const projectIndex = state.archivedProjects.findIndex(
              p => p.path === projectPath
            );

            if (projectIndex === -1) return {};

            // Get the project and remove from archived
            const project = state.archivedProjects[projectIndex];
            const newArchivedProjects = [...state.archivedProjects];
            newArchivedProjects.splice(projectIndex, 1);

            return {
              currentProject: {
                ...project,
                lastOpened: Date.now()
              },
              archivedProjects: newArchivedProjects
            };
          } catch (error) {
            console.error('Error unarchiving project:', error);
            return {};
          }
        }),

        showProjectArchiveMessage: (show) => set({
          showProjectShelvingMessage: show
        }),

        getArchivedProjects: () => {
          return get().archivedProjects;
        },

        updateProjectCreationProgress: (progress) => set({
          projectCreationProgress: progress
        }),

        // Detect project type
        detectProjectType: async (path) => {
          try {
            const response = await fetch('/api/project-detector', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ path })
            });

            const data = await response.json();
            return data.type || 'generic';
          } catch (error) {
            console.error('Error detecting project type:', error);
            return 'generic';
          }
        },

        getRecentDirectories: () => {
          const { directoryHistory } = get();
          return directoryHistory;
        },

        addToDirectoryHistory: (path) => set((state) => {
          if (state.directoryHistory.includes(path)) {
            return {};
          }
          return {
            directoryHistory: [...state.directoryHistory.slice(-9), path]
          };
        }),

        // Terminal split operations
        createTerminalSplit: (direction, terminalIds) => set((state) => {
          const newSplitId = `split-${Date.now()}`;
          return {
            terminalSplits: [
              ...state.terminalSplits,
              {
                id: newSplitId,
                direction,
                terminals: terminalIds,
                sizes: Array(terminalIds.length).fill(100 / terminalIds.length)
              }
            ],
            activeSplitId: newSplitId,
            terminals: state.terminals.map(term =>
              terminalIds.includes(term.id)
                ? { ...term, splitId: newSplitId }
                : term
            )
          };
        }),

        splitTerminalHorizontal: (terminalId) => {
          const state = get();
          const terminalCount = state.terminals.length + 1;
          const newTerminal: TerminalInstance = {
            id: `terminal-${Date.now()}`,
            name: `Terminal ${terminalCount}`,
            type: 'cmd',
            createdAt: Date.now()
          };

          set((state) => ({
            terminals: [...state.terminals, newTerminal],
            activeTerminalId: newTerminal.id
          }));

          // Şimdi yeni terminal oluşturuldu, split'i oluşturabiliriz
          get().createTerminalSplit('horizontal', [terminalId, newTerminal.id]);
        },

        splitTerminalVertical: (terminalId) => {
          const state = get();
          const terminalCount = state.terminals.length + 1;
          const newTerminal: TerminalInstance = {
            id: `terminal-${Date.now()}`,
            name: `Terminal ${terminalCount}`,
            type: 'cmd',
            createdAt: Date.now()
          };

          set((state) => ({
            terminals: [...state.terminals, newTerminal],
            activeTerminalId: newTerminal.id
          }));

          // Şimdi yeni terminal oluşturuldu, split'i oluşturabiliriz
          get().createTerminalSplit('vertical', [terminalId, newTerminal.id]);
        },

        closeSplit: (splitId) => set((state) => {
          const terminalsInSplit = state.terminals.filter(t => t.splitId === splitId);

          return {
            terminalSplits: state.terminalSplits.filter(s => s.id !== splitId),
            activeSplitId: state.activeSplitId === splitId ? null : state.activeSplitId,
            terminals: state.terminals.map(term =>
              term.splitId === splitId
                ? { ...term, splitId: undefined }
                : term
            )
          };
        }),

        resizeSplit: (splitId, sizes) => set((state) => ({
          terminalSplits: state.terminalSplits.map(split =>
            split.id === splitId
              ? { ...split, sizes }
              : split
          )
        })),

        addTerminalToSplit: (splitId, terminalId) => set((state) => {
          const split = state.terminalSplits.find(s => s.id === splitId);
          if (!split) return {};

          return {
            terminalSplits: state.terminalSplits.map(s =>
              s.id === splitId
                ? {
                  ...s,
                  terminals: [...s.terminals, terminalId],
                  sizes: Array(s.terminals.length + 1).fill(100 / (s.terminals.length + 1))
                }
                : s
            ),
            terminals: state.terminals.map(term =>
              term.id === terminalId
                ? { ...term, splitId }
                : term
            )
          };
        }),

        removeTerminalFromSplit: (splitId, terminalId) => set((state) => {
          const split = state.terminalSplits.find(s => s.id === splitId);
          if (!split) return {};

          // If it's the last terminal in the split, close the split
          if (split.terminals.length <= 1) {
            const newTerminalSplits = state.terminalSplits.filter(s => s.id !== splitId);
            const newTerminals = state.terminals.map(term =>
              term.splitId === splitId
                ? { ...term, splitId: undefined }
                : term
            );

            return {
              terminalSplits: newTerminalSplits,
              activeSplitId: state.activeSplitId === splitId ? null : state.activeSplitId,
              terminals: newTerminals
            };
          }

          const newTerminals = split.terminals.filter(id => id !== terminalId);

          return {
            terminalSplits: state.terminalSplits.map(s =>
              s.id === splitId
                ? {
                  ...s,
                  terminals: newTerminals,
                  sizes: Array(newTerminals.length).fill(100 / newTerminals.length)
                }
                : s
            ),
            terminals: state.terminals.map(term =>
              term.id === terminalId
                ? { ...term, splitId: undefined }
                : term
            )
          };
        }),

        // Project Terminal Commands
        addProjectTerminalCommands: (projectPath, commands) => set((state) => {
          const existingIndex = state.projectTerminalCommands.findIndex(
            ptc => ptc.projectPath === projectPath
          );

          if (existingIndex >= 0) {
            // Update existing commands
            const updatedCommands = [...state.projectTerminalCommands];
            updatedCommands[existingIndex] = {
              projectPath,
              commands
            };
            return { projectTerminalCommands: updatedCommands };
          } else {
            // Add new commands
            return {
              projectTerminalCommands: [
                ...state.projectTerminalCommands,
                { projectPath, commands }
              ]
            };
          }
        }),

        getProjectTerminalCommands: (projectPath) => {
          const { projectTerminalCommands } = get();
          const projectCommands = projectTerminalCommands.find(
            ptc => ptc.projectPath === projectPath
          );
          return projectCommands?.commands;
        },

        // Terminal setup complete
        setTerminalSetupComplete: (terminalId, isComplete) => set((state) => ({
          terminals: state.terminals.map(term =>
            term.id === terminalId
              ? { ...term, projectSetupComplete: isComplete }
              : term
          )
        })),

        // File Management Actions
        setFileToDelete: (path) => set({ fileToDelete: path }),
        setShowDeleteDialog: (show) => set({ showDeleteDialog: show }),
        setError: (message) => {
          console.log('Error:', message)
          // Bu fonksiyon sadece geçici hata mesajlarını göstermek için kullanılıyor
          // Gerçek bir state değişikliği yapmaz
        },
        deleteFile: async (path) => {
          try {
            // GitHub dosyası silme işlemi burada gerçekleştirilecek
            // Şu an için sadece dosyayı fileTree'den kaldırıyoruz

            const { fileTree, setFileTree } = get()

            // Recursive olarak dosyayı veya klasörü bul ve kaldır
            const removeNode = (nodes: FileNode[]): FileNode[] => {
              return nodes.filter(node => {
                if (node.path === path) {
                  return false // Bu node'u kaldır
                }

                if (node.type === 'folder' && node.children) {
                  node.children = removeNode(node.children)
                }

                return true
              })
            }

            const updatedTree = removeNode(fileTree)
            setFileTree(updatedTree)

            return true
          } catch (error) {
            console.error('Error deleting file:', error)
            return false
          }
        },
      }),
      persistOptions
    )
  )
)

// Add a helper function to update project creation progress
export const updateProjectProgress = (progress: ProjectCreationProgress | null): void => {
  useIDEStore.getState().updateProjectCreationProgress(progress);
}

// Add a helper function to add project terminal commands
export const addProjectTerminalCommands = (projectPath: string, commands: string[]): void => {
  console.log('Adding commands to store:', { projectPath, commands });

  // Normalize path for consistent storage
  const normalizedPath = projectPath.replace(/\\/g, '/');

  useIDEStore.setState(state => {
    // Create a new array with all commands except any existing ones for this path
    const filteredCommands = state.projectTerminalCommands.filter(cmd =>
      cmd.projectPath.replace(/\\/g, '/') !== normalizedPath
    );

    // Add the new commands
    const updatedCommands = [
      ...filteredCommands,
      { projectPath: normalizedPath, commands }
    ];

    console.log('Updated store commands:', updatedCommands);

    return {
      projectTerminalCommands: updatedCommands
    };
  });
}

// Export action creators with improved logging and error handling
export const getProjectTerminalCommands = (projectPath: string): string[] | undefined => {
  const state = useIDEStore.getState();

  // Normalize path for consistent comparison (Windows paths can be inconsistent)
  const normalizedSearchPath = projectPath.replace(/\\/g, '/').toLowerCase();

  // Debug logs
  console.log('Getting project commands for path:', normalizedSearchPath);
  console.log('Available command paths:', state.projectTerminalCommands.map(cmd =>
    cmd.projectPath.replace(/\\/g, '/').toLowerCase()
  ));

  // Look for exact match first
  const commandSet = state.projectTerminalCommands.find(cmd =>
    cmd.projectPath.replace(/\\/g, '/').toLowerCase() === normalizedSearchPath
  );

  if (commandSet) {
    console.log('Found commands for path:', commandSet.commands);
    return commandSet.commands;
  }

  // If no exact match, try to find by path containing project name
  const projectName = normalizedSearchPath.split('/').pop();
  if (projectName) {
    // Try to find a path that ends with the project name
    for (const cmd of state.projectTerminalCommands) {
      const cmdPath = cmd.projectPath.replace(/\\/g, '/').toLowerCase();
      if (cmdPath.endsWith(`/${projectName}`)) {
        console.log('Found commands by project name:', cmd.commands);
        return cmd.commands;
      }
    }
  }

  console.log('No commands found for path:', normalizedSearchPath);
  return undefined;
}
