export interface FrameworkConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'web' | 'mobile' | 'backend' | 'desktop';
    commands: {
        create: string[];
        install: string[];
        dev: string[];
        build: string[];
    };
    packageManager: 'npm' | 'yarn' | 'pip' | 'pub' | 'composer' | 'go' | 'cargo';
    extensions: string[];
    templates: string[];
    defaultDependencies?: string[];
}

export const frameworkConfigs: FrameworkConfig[] = [
    // Web Frameworks
    {
        id: 'nextjs',
        name: 'Next.js',
        description: 'React framework with SSR and static generation',
        icon: '⚡',
        category: 'web',
        commands: {
            create: ['npx create-next-app@latest {projectName} --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"'],
            install: ['npm install'],
            dev: ['npm run dev'],
            build: ['npm run build']
        },
        packageManager: 'npm',
        extensions: ['.tsx', '.ts', '.jsx', '.js'],
        templates: ['default', 'blog', 'e-commerce', 'dashboard'],
        defaultDependencies: ['@types/node', '@types/react', '@types/react-dom']
    },
    {
        id: 'react-vite',
        name: 'React + Vite',
        description: 'Fast React development with Vite',
        icon: '⚛️',
        category: 'web',
        commands: {
            create: ['npm create vite@latest {projectName} -- --template react-ts'],
            install: ['npm install'],
            dev: ['npm run dev'],
            build: ['npm run build']
        },
        packageManager: 'npm',
        extensions: ['.tsx', '.ts', '.jsx', '.js'],
        templates: ['default', 'pwa', 'component-library']
    },
    {
        id: 'vue',
        name: 'Vue.js',
        description: 'Progressive JavaScript framework',
        icon: '💚',
        category: 'web',
        commands: {
            create: ['npm create vue@latest {projectName}'],
            install: ['npm install'],
            dev: ['npm run dev'],
            build: ['npm run build']
        },
        packageManager: 'npm',
        extensions: ['.vue', '.ts', '.js'],
        templates: ['default', 'composition-api', 'options-api']
    },
    {
        id: 'svelte',
        name: 'SvelteKit',
        description: 'Cybernetically enhanced web apps',
        icon: '🔥',
        category: 'web',
        commands: {
            create: ['npm create svelte@latest {projectName}'],
            install: ['npm install'],
            dev: ['npm run dev'],
            build: ['npm run build']
        },
        packageManager: 'npm',
        extensions: ['.svelte', '.ts', '.js'],
        templates: ['default', 'skeleton', 'demo']
    },

    // Mobile Frameworks
    {
        id: 'flutter',
        name: 'Flutter',
        description: 'Google\'s UI toolkit for mobile, web, and desktop',
        icon: '📱',
        category: 'mobile',
        commands: {
            create: ['flutter create {projectName}'],
            install: ['flutter pub get'],
            dev: ['flutter run'],
            build: ['flutter build apk']
        },
        packageManager: 'pub',
        extensions: ['.dart'],
        templates: ['app', 'module', 'package', 'plugin']
    },
    {
        id: 'react-native',
        name: 'React Native',
        description: 'Build mobile apps with React',
        icon: '📱',
        category: 'mobile',
        commands: {
            create: ['npx react-native@latest init {projectName}'],
            install: ['npm install'],
            dev: ['npx react-native start'],
            build: ['npx react-native run-android']
        },
        packageManager: 'npm',
        extensions: ['.tsx', '.ts', '.jsx', '.js'],
        templates: ['default', 'typescript', 'navigation']
    },

    // Backend Frameworks
    {
        id: 'node-express',
        name: 'Node.js + Express',
        description: 'Fast, unopinionated web framework for Node.js',
        icon: '🟢',
        category: 'backend',
        commands: {
            create: ['mkdir {projectName}', 'cd {projectName}', 'npm init -y', 'npm install express'],
            install: ['npm install'],
            dev: ['npm run dev'],
            build: ['npm run build']
        },
        packageManager: 'npm',
        extensions: ['.js', '.ts'],
        templates: ['basic', 'api', 'mvc', 'graphql'],
        defaultDependencies: ['express', '@types/express', 'nodemon', 'typescript', '@types/node']
    },
    {
        id: 'fastapi',
        name: 'FastAPI',
        description: 'Modern, fast Python web framework',
        icon: '🐍',
        category: 'backend',
        commands: {
            create: ['mkdir {projectName}', 'cd {projectName}', 'python -m venv venv'],
            install: ['pip install fastapi uvicorn'],
            dev: ['uvicorn main:app --reload'],
            build: ['pip freeze > requirements.txt']
        },
        packageManager: 'pip',
        extensions: ['.py'],
        templates: ['basic', 'crud', 'auth', 'microservice']
    },
    {
        id: 'django',
        name: 'Django',
        description: 'High-level Python web framework',
        icon: '🐍',
        category: 'backend',
        commands: {
            create: ['django-admin startproject {projectName}'],
            install: ['pip install -r requirements.txt'],
            dev: ['python manage.py runserver'],
            build: ['python manage.py collectstatic']
        },
        packageManager: 'pip',
        extensions: ['.py'],
        templates: ['basic', 'rest-api', 'cms', 'e-commerce']
    },
    {
        id: 'go-gin',
        name: 'Go + Gin',
        description: 'HTTP web framework written in Go',
        icon: '🐹',
        category: 'backend',
        commands: {
            create: ['mkdir {projectName}', 'cd {projectName}', 'go mod init {projectName}'],
            install: ['go mod tidy'],
            dev: ['go run main.go'],
            build: ['go build']
        },
        packageManager: 'go',
        extensions: ['.go'],
        templates: ['basic', 'rest-api', 'microservice']
    },
    {
        id: 'rust-actix',
        name: 'Rust + Actix',
        description: 'Powerful, pragmatic, and extremely fast web framework',
        icon: '🦀',
        category: 'backend',
        commands: {
            create: ['cargo new {projectName}'],
            install: ['cargo build'],
            dev: ['cargo run'],
            build: ['cargo build --release']
        },
        packageManager: 'cargo',
        extensions: ['.rs'],
        templates: ['basic', 'web-api', 'microservice']
    },

    // Desktop
    {
        id: 'electron',
        name: 'Electron',
        description: 'Build cross-platform desktop apps with web technologies',
        icon: '💻',
        category: 'desktop',
        commands: {
            create: ['mkdir {projectName}', 'cd {projectName}', 'npm init -y', 'npm install electron --save-dev'],
            install: ['npm install'],
            dev: ['npm start'],
            build: ['npm run build']
        },
        packageManager: 'npm',
        extensions: ['.js', '.ts', '.html'],
        templates: ['basic', 'react', 'vue']
    },
    {
        id: 'tauri',
        name: 'Tauri',
        description: 'Build smaller, faster, and more secure desktop applications',
        icon: '💻',
        category: 'desktop',
        commands: {
            create: ['npm create tauri-app@latest {projectName}'],
            install: ['npm install'],
            dev: ['npm run tauri dev'],
            build: ['npm run tauri build']
        },
        packageManager: 'npm',
        extensions: ['.rs', '.ts', '.js'],
        templates: ['vanilla', 'react', 'vue', 'svelte']
    }
];

export const getFrameworksByCategory = (category: FrameworkConfig['category']) => {
    return frameworkConfigs.filter(config => config.category === category);
};

export const getFrameworkById = (id: string) => {
    return frameworkConfigs.find(config => config.id === id);
};

export const getAllCategories = () => {
    return Array.from(new Set(frameworkConfigs.map(config => config.category)));
};
