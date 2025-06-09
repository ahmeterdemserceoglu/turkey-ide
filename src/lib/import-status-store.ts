// Shared in-memory store for project import progress tracking
// In a production app, this would be stored in a database or a shared cache like Redis

export interface ImportStatus {
    id: string;
    projectName: string;
    repoUrl: string;
    branch: string;
    progress: number;
    message: string;
    complete: boolean;
    error?: string;
    startedAt: number;
    project?: { name: string; path: string; framework?: string };
}

export const importStatuses = new Map<string, ImportStatus>();

// Clean up old imports periodically
if (typeof global !== "undefined") {
    // Only run this on the server side
    const cleanupInterval = 30 * 60 * 1000; // 30 minutes

    // We want to ensure this only runs once even in dev mode with hot reloading
    if (!(global as any).__importStatusCleanupInitialized) {
        setInterval(() => {
            const now = Date.now();
            const twoHoursAgo = now - (2 * 60 * 60 * 1000); // 2 hours

            for (const [id, status] of importStatuses.entries()) {
                if (status.startedAt < twoHoursAgo) {
                    importStatuses.delete(id);
                    console.log(`Cleaned up stale import status: ${id}`);
                }
            }
        }, cleanupInterval);

        (global as any).__importStatusCleanupInitialized = true;
        console.log("Import status cleanup initialized");
    }
}

// Helper functions
export function updateImportStatus(importId: string, update: Partial<ImportStatus>) {
    const status = importStatuses.get(importId);
    if (status) {
        Object.assign(status, update);
    }
}

export function getImportStatus(importId: string): ImportStatus | undefined {
    return importStatuses.get(importId);
}

export function createImportStatus(
    importId: string,
    projectName: string,
    repoUrl: string,
    branch: string
): ImportStatus {
    const status: ImportStatus = {
        id: importId,
        projectName,
        repoUrl,
        branch,
        progress: 0,
        message: 'İçeri aktarma hazırlanıyor',
        complete: false,
        startedAt: Date.now(),
    };

    importStatuses.set(importId, status);
    return status;
}
