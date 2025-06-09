// Tip tanımlamalarını ekle
import { type Project, type FileNode as FileTreeNode } from '@/store/ide-store';

/**
 * Proje için varsayılan dosya ağacını oluşturur
 * @param project Proje metadata
 * @returns Proje için varsayılan dosya ağacı
 */
export function createDefaultProjectFileTree(project: Project): FileTreeNode[] {
    // Projenin root klasörünü oluştur
    const rootFolder: FileTreeNode = {
        id: project.id,
        name: project.name,
        type: 'folder',
        path: project.path,
        isExpanded: true,
        children: []
    };

    // Klasör yapısını oluştur
    const srcFolder: FileTreeNode = {
        id: `${project.id}-src`,
        name: 'src',
        type: 'folder',
        path: `${project.path}/src`,
        isExpanded: true,
        children: []
    };

    const componentsFolder: FileTreeNode = {
        id: `${project.id}-components`,
        name: 'components',
        type: 'folder',
        path: `${project.path}/src/components`,
        isExpanded: false,
        children: []
    };

    const pagesFolder: FileTreeNode = {
        id: `${project.id}-pages`,
        name: 'pages',
        type: 'folder',
        path: `${project.path}/src/pages`,
        isExpanded: false,
        children: []
    };

    const publicFolder: FileTreeNode = {
        id: `${project.id}-public`,
        name: 'public',
        type: 'folder',
        path: `${project.path}/public`,
        isExpanded: false,
        children: []
    };

    // Varsayılan dosyaları oluştur
    const packageJson: FileTreeNode = {
        id: `${project.id}-package-json`,
        name: 'package.json',
        type: 'file',
        path: `${project.path}/package.json`,
        content: getPackageJsonContent(project.name),
        isExpanded: false
    };

    const readme: FileTreeNode = {
        id: `${project.id}-readme`,
        name: 'README.md',
        type: 'file',
        path: `${project.path}/README.md`,
        content: getReadmeContent(project.name),
        isExpanded: false
    };

    // Alt klasörleri ve dosyaları ana klasörlere ekle
    srcFolder.children?.push(componentsFolder);
    srcFolder.children?.push(pagesFolder);

    // Tüm klasörleri ve dosyaları root klasöre ekle
    rootFolder.children?.push(srcFolder);
    rootFolder.children?.push(publicFolder);
    rootFolder.children?.push(packageJson);
    rootFolder.children?.push(readme);

    return [rootFolder];
}

/**
 * package.json içeriğini oluşturur
 * @param projectName Proje adı
 * @returns package.json içeriği
 */
function getPackageJsonContent(projectName: string): string {
    return JSON.stringify({
        name: projectName.toLowerCase().replace(/\s+/g, '-'),
        version: '1.0.0',
        description: '',
        main: 'index.js',
        scripts: {
            start: 'node index.js',
            dev: 'nodemon index.js',
            test: 'echo "Error: no test specified" && exit 1'
        },
        keywords: [],
        author: '',
        license: 'ISC',
        dependencies: {},
        devDependencies: {}
    }, null, 2);
}

/**
 * README.md içeriğini oluşturur
 * @param projectName Proje adı
 * @returns README.md içeriği
 */
function getReadmeContent(projectName: string): string {
    return `# ${projectName}\n\nBu proje Turkish IDE üzerinde oluşturulmuştur.\n`;
} 