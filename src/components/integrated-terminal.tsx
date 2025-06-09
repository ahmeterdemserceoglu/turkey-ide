'use client'

import { useEffect } from 'react'
import { useIDEStore } from '@/store/ide-store'

export function useTerminalInitialization() {
    const { setTerminalCwd, fileTree } = useIDEStore()

    // Set up terminals to always start in the project folder when available
    useEffect(() => {
        // Check if we have any project folders in the file tree
        if (fileTree && fileTree.length > 0) {
            // Look for project folders at the root level (not system folders)
            const projectFolders = fileTree.filter(node =>
                node.type === 'folder' && !node.name.startsWith('.')
            );

            if (projectFolders.length > 0) {
                // Use the first project folder as the default directory
                setTerminalCwd(projectFolders[0].path);
                console.log(`Terminal initialized to project: ${projectFolders[0].path}`);
                return;
            }
        }

        // If no projects found, use the root directory
        const projectDir = '/'
        setTerminalCwd(projectDir)
        console.log('No projects found, terminal initialized to root directory');

        // Listen for file system changes to update terminal directory automatically
        const handleFileSystemChange = (event: StorageEvent) => {
            if (event.key === 'turkish-ide-storage') {
                try {
                    const data = JSON.parse(event.newValue || '')
                    if (data.state?.fileTree) {
                        // Check if we have a project root with a name
                        const projects = data.state.fileTree.filter((node: any) =>
                            node.type === 'folder' && !node.name.startsWith('.'))

                        if (projects.length > 0) {
                            // Use the first project as default directory
                            setTerminalCwd(projects[0].path)
                            console.log(`Terminal updated to project: ${projects[0].path}`);
                        }
                    }
                } catch (err) {
                    console.error('Error handling storage event:', err)
                }
            }
        }

        // Add event listener for storage changes
        window.addEventListener('storage', handleFileSystemChange)

        return () => {
            window.removeEventListener('storage', handleFileSystemChange)
        }
    }, [fileTree, setTerminalCwd])
} 