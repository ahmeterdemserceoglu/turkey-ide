'use client';

// localStorage utility functions for project management

interface Project {
    id: string;
    name: string;
    path: string;
    type: string;
    framework?: string;
    frameworkName?: string;
    createdAt: number;
    lastOpened?: number;
}

// FileNode tipini burada da tanımlayalım
interface FileNode {
    id: string;
    name: string;
    type: 'file' | 'folder';
    path: string;
    content?: string;
    children?: FileNode[];
    isExpanded?: boolean;
}

const PROJECT_STORAGE_KEY = 'turkish-ide-projects';
const CURRENT_PROJECT_KEY = 'turkish-ide-current-project';
const ARCHIVED_PROJECTS_KEY = 'turkish-ide-archived-projects';

// Check if code is running in browser environment
const isBrowser = typeof window !== 'undefined';

// Get all projects from localStorage
export function getProjects(): Project[] {
    try {
        if (!isBrowser) return [];

        const projects = localStorage.getItem(PROJECT_STORAGE_KEY);
        return projects ? JSON.parse(projects) : [];
    } catch (error) {
        console.error('Error getting projects from localStorage:', error);
        return [];
    }
}

// Save all projects to localStorage
export function saveProjects(projects: Project[]): void {
    try {
        if (!isBrowser) return;

        localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
        console.error('Error saving projects to localStorage:', error);
    }
}

// Add or update a project
export function saveProject(project: Project): void {
    try {
        if (!isBrowser) return;

        const projects = getProjects();
        const existingIndex = projects.findIndex(p => p.id === project.id);

        if (existingIndex >= 0) {
            // Update existing project
            projects[existingIndex] = {
                ...projects[existingIndex],
                ...project,
                lastOpened: Date.now(),
            };
        } else {
            // Add new project
            projects.push({
                ...project,
                id: project.id || `project-${Date.now()}`,
                createdAt: Date.now(),
                lastOpened: Date.now(),
            });
        }

        saveProjects(projects);
    } catch (error) {
        console.error('Error saving project to localStorage:', error);
    }
}

// Get project by ID
export function getProjectById(id: string): Project | null {
    try {
        if (!isBrowser) return null;

        const projects = getProjects();
        return projects.find(p => p.id === id) || null;
    } catch (error) {
        console.error('Error getting project by ID from localStorage:', error);
        return null;
    }
}

// Delete project by ID
export function deleteProject(id: string): void {
    try {
        if (!isBrowser) return;

        const projects = getProjects();
        const filteredProjects = projects.filter(p => p.id !== id);
        saveProjects(filteredProjects);
    } catch (error) {
        console.error('Error deleting project from localStorage:', error);
    }
}

// Get current project
export function getCurrentProject(): Project | null {
    try {
        if (!isBrowser) return null;

        const currentProject = localStorage.getItem(CURRENT_PROJECT_KEY);
        return currentProject ? JSON.parse(currentProject) : null;
    } catch (error) {
        console.error('Error getting current project from localStorage:', error);
        return null;
    }
}

// Set current project
export function setCurrentProject(project: Project | null): void {
    try {
        if (!isBrowser) return;

        if (project) {
            localStorage.setItem(CURRENT_PROJECT_KEY, JSON.stringify({
                ...project,
                lastOpened: Date.now(),
            }));

            // Also update in the projects list
            saveProject(project);
        } else {
            localStorage.removeItem(CURRENT_PROJECT_KEY);
        }
    } catch (error) {
        console.error('Error setting current project in localStorage:', error);
    }
}

// Get archived projects
export function getArchivedProjects(): Project[] {
    try {
        if (!isBrowser) return [];

        const archivedProjects = localStorage.getItem(ARCHIVED_PROJECTS_KEY);
        return archivedProjects ? JSON.parse(archivedProjects) : [];
    } catch (error) {
        console.error('Error getting archived projects from localStorage:', error);
        return [];
    }
}

// Save archived projects
export function saveArchivedProjects(projects: Project[]): void {
    try {
        if (!isBrowser) return;

        localStorage.setItem(ARCHIVED_PROJECTS_KEY, JSON.stringify(projects));
    } catch (error) {
        console.error('Error saving archived projects to localStorage:', error);
    }
}

// Archive a project
export function archiveProject(project: Project): void {
    try {
        if (!isBrowser) return;

        const archivedProjects = getArchivedProjects();
        const existingIndex = archivedProjects.findIndex(p => p.id === project.id);

        if (existingIndex >= 0) {
            // Update existing archived project
            archivedProjects[existingIndex] = {
                ...archivedProjects[existingIndex],
                ...project,
                lastOpened: Date.now(),
            };
        } else {
            // Add to archived projects
            archivedProjects.push({
                ...project,
                lastOpened: Date.now(),
            });
        }

        saveArchivedProjects(archivedProjects);

        // Remove from current project if it's the same
        const currentProject = getCurrentProject();
        if (currentProject && currentProject.id === project.id) {
            setCurrentProject(null);
        }
    } catch (error) {
        console.error('Error archiving project in localStorage:', error);
    }
}

// Unarchive a project
export function unarchiveProject(id: string): Project | null {
    try {
        if (!isBrowser) return null;

        const archivedProjects = getArchivedProjects();
        const projectIndex = archivedProjects.findIndex(p => p.id === id);

        if (projectIndex >= 0) {
            // Remove from archived projects
            const [project] = archivedProjects.splice(projectIndex, 1);
            saveArchivedProjects(archivedProjects);

            // Add to regular projects and set as current
            saveProject(project);
            setCurrentProject(project);

            return project;
        }
        return null;
    } catch (error) {
        console.error('Error unarchiving project from localStorage:', error);
        return null;
    }
}

// Save project file tree
export function saveProjectFileTree(projectId: string, fileTree: FileNode[]): void {
    try {
        if (!isBrowser) return;

        localStorage.setItem(`project-file-tree-${projectId}`, JSON.stringify(fileTree));
    } catch (error) {
        console.error('Error saving project file tree to localStorage:', error);
    }
}

// Get project file tree
export function getProjectFileTree(projectId: string): FileNode[] {
    try {
        if (!isBrowser) return [];

        const fileTree = localStorage.getItem(`project-file-tree-${projectId}`);
        return fileTree ? JSON.parse(fileTree) : [];
    } catch (error) {
        console.error('Error getting project file tree from localStorage:', error);
        return [];
    }
}

// Save project terminal commands
export function saveProjectCommands(projectId: string, commands: string[]): void {
    try {
        if (!isBrowser) return;

        localStorage.setItem(`project-commands-${projectId}`, JSON.stringify(commands));
    } catch (error) {
        console.error('Error saving project commands to localStorage:', error);
    }
}

// Get project terminal commands
export function getProjectCommands(projectId: string): string[] {
    try {
        if (!isBrowser) return [];

        const commands = localStorage.getItem(`project-commands-${projectId}`);
        return commands ? JSON.parse(commands) : [];
    } catch (error) {
        console.error('Error getting project commands from localStorage:', error);
        return [];
    }
}

/**
 * Varsayılan sanal dosya yapısını oluşturan yardımcı fonksiyon
 */
export function createDefaultProjectFileTree(project: Project): FileNode[] {
    const projectName = project.name;
    const rootFolder: FileNode = {
        id: `folder-${project.id}`,
        name: projectName,
        type: 'folder',
        path: project.path,
        isExpanded: true,
        children: [
            {
                id: `file-readme-${project.id}`,
                name: 'README.md',
                type: 'file',
                path: `${project.path}/README.md`,
                content: `# ${projectName}\n\nBu proje ${project.frameworkName || 'framework'} kullanılarak oluşturulmuştur.\n\n## Başlangıç\n\nGeliştirmeye başlamak için:\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## Özellikler\n\n- ${project.frameworkName || 'Framework'} tabanlı proje\n- Özelleştirilebilir yapılandırma\n- Modern geliştirme araçları`
            },
            {
                id: `folder-src-${project.id}`,
                name: 'src',
                type: 'folder',
                path: `${project.path}/src`,
                isExpanded: false,
                children: [
                    {
                        id: `file-index-${project.id}`,
                        name: 'index.js',
                        type: 'file',
                        path: `${project.path}/src/index.js`,
                        content: `// ${projectName} ana dosyası\n\nconsole.log('${projectName} başlatılıyor...');\n\n// Temel uygulama kodu buraya gelecek\nfunction main() {\n  console.log('Uygulama başlatıldı!');\n  \n  // Uygulama mantığı\n  return {\n    init: () => console.log('Hazır'),\n    start: () => console.log('Başladı')\n  };\n}\n\n// Uygulamayı başlat\nconst app = main();\napp.init();\napp.start();`
                    },
                    {
                        id: `folder-components-${project.id}`,
                        name: 'components',
                        type: 'folder',
                        path: `${project.path}/src/components`,
                        children: [
                            {
                                id: `file-button-${project.id}`,
                                name: 'Button.jsx',
                                type: 'file',
                                path: `${project.path}/src/components/Button.jsx`,
                                content: `import React from 'react';\n\nconst Button = ({ children, onClick, variant = 'primary' }) => {\n  return (\n    <button \n      className={\`btn btn-\${variant}\`}\n      onClick={onClick}\n    >\n      {children}\n    </button>\n  );\n};\n\nexport default Button;`
                            }
                        ]
                    }
                ]
            },
            {
                id: `file-package-${project.id}`,
                name: 'package.json',
                type: 'file',
                path: `${project.path}/package.json`,
                content: JSON.stringify({
                    name: projectName.toLowerCase().replace(/\s+/g, '-'),
                    version: '0.1.0',
                    private: true,
                    description: `${projectName} projesi`,
                    scripts: {
                        dev: "next dev",
                        build: "next build",
                        start: "next start",
                        lint: "next lint"
                    },
                    dependencies: {
                        "react": "^18.2.0",
                        "react-dom": "^18.2.0",
                        "next": "^13.4.1"
                    },
                    devDependencies: {
                        "typescript": "^5.0.4",
                        "@types/react": "^18.2.0",
                        "@types/node": "^18.16.3",
                        "eslint": "^8.39.0"
                    },
                    type: project.type || "module",
                    framework: project.framework
                }, null, 2)
            },
            {
                id: `file-gitignore-${project.id}`,
                name: '.gitignore',
                type: 'file',
                path: `${project.path}/.gitignore`,
                content: `# dependencies\n/node_modules\n/.pnp\n.pnp.js\n\n# testing\n/coverage\n\n# next.js\n/.next/\n/out/\n\n# production\n/build\n\n# misc\n.DS_Store\n*.pem\n\n# debug\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n\n# local env files\n.env*.local\n\n# vercel\n.vercel\n\n# typescript\n*.tsbuildinfo\nnext-env.d.ts`
            }
        ]
    };

    return [rootFolder];
}

/**
 * Yeni proje oluşturulduğunda hem projeyi hem de varsayılan dosya yapısını kaydet
 */
export function createProjectWithFiles(project: Project): void {
    // Önce projeyi kaydet
    saveProject(project);

    // Sonra varsayılan dosya yapısını oluştur ve kaydet
    const fileTree = createDefaultProjectFileTree(project);
    saveProjectFileTree(project.id, fileTree);

    // Güncel projeyi de ayarla
    setCurrentProject(project);
}

/**
 * Belirli bir dosyanın içeriğini günceller
 */
export function updateFileContent(filePath: string, content: string): void {
    if (!isBrowser) return;

    try {
        // Tüm projeleri kontrol et ve hangi projeye ait olduğunu bul
        const projects = getProjects();
        let projectId = null;

        for (const project of projects) {
            if (filePath.startsWith(project.path)) {
                projectId = project.id;
                break;
            }
        }

        if (!projectId) return;

        // Projenin dosya yapısını al
        const fileTree = getProjectFileTree(projectId);
        if (!fileTree || fileTree.length === 0) return;

        // Dosyayı bul ve içeriğini güncelle
        const updateNode = (nodes: FileNode[]): boolean => {
            for (const node of nodes) {
                if (node.path === filePath) {
                    node.content = content;
                    return true;
                }

                if (node.children && node.children.length > 0) {
                    if (updateNode(node.children)) {
                        return true;
                    }
                }
            }

            return false;
        };

        if (updateNode(fileTree)) {
            // Güncellenmiş dosya yapısını kaydet
            saveProjectFileTree(projectId, fileTree);
            return;
        }
    } catch (error) {
        console.error('Error updating file content in localStorage:', error);
    }
}

/**
 * Bir dosya veya klasör ekler
 */
export function addFileOrFolder(parentPath: string, node: FileNode): void {
    if (!isBrowser) return;

    try {
        // Tüm projeleri kontrol et ve hangi projeye ait olduğunu bul
        const projects = getProjects();
        let projectId = null;

        for (const project of projects) {
            if (parentPath.startsWith(project.path)) {
                projectId = project.id;
                break;
            }
        }

        if (!projectId) return;

        // Projenin dosya yapısını al
        const fileTree = getProjectFileTree(projectId);
        if (!fileTree || fileTree.length === 0) return;

        // Ebeveyn klasörü bul ve yeni dosya/klasörü ekle
        const addToParent = (nodes: FileNode[]): boolean => {
            for (const node of nodes) {
                if (node.path === parentPath && node.type === 'folder') {
                    if (!node.children) node.children = [];
                    node.children.push(node);
                    return true;
                }

                if (node.children && node.children.length > 0) {
                    if (addToParent(node.children)) {
                        return true;
                    }
                }
            }

            return false;
        };

        if (addToParent(fileTree)) {
            // Güncellenmiş dosya yapısını kaydet
            saveProjectFileTree(projectId, fileTree);
        }
    } catch (error) {
        console.error('Error adding file or folder to localStorage:', error);
    }
} 