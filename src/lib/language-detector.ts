export interface LanguageInfo {
    name: string
    displayName: string
    extensions: string[]
    icon: string
    color: string
    packageManagers: PackageManager[]
    defaultCommands: Record<string, string>
    fileIcon?: string
}

export interface PackageManager {
    name: string
    displayName: string
    installCommand: string
    initCommand?: string
    runCommand?: string
    testCommand?: string
    buildCommand?: string
    devCommand?: string
    configFile?: string
}

export const LANGUAGE_CONFIGS: Record<string, LanguageInfo> = {
    javascript: {
        name: 'javascript',
        displayName: 'JavaScript',
        extensions: ['.js', '.mjs', '.cjs'],
        icon: '🟨',
        color: '#F7DF1E',
        fileIcon: 'js',
        packageManagers: [
            {
                name: 'npm',
                displayName: 'npm',
                installCommand: 'npm install',
                initCommand: 'npm init -y',
                runCommand: 'npm run',
                testCommand: 'npm test',
                buildCommand: 'npm run build',
                devCommand: 'npm run dev',
                configFile: 'package.json'
            },
            {
                name: 'yarn',
                displayName: 'Yarn',
                installCommand: 'yarn',
                initCommand: 'yarn init -y',
                runCommand: 'yarn',
                testCommand: 'yarn test',
                buildCommand: 'yarn build',
                devCommand: 'yarn dev',
                configFile: 'package.json'
            },
            {
                name: 'pnpm',
                displayName: 'pnpm',
                installCommand: 'pnpm install',
                initCommand: 'pnpm init',
                runCommand: 'pnpm',
                testCommand: 'pnpm test',
                buildCommand: 'pnpm build',
                devCommand: 'pnpm dev',
                configFile: 'package.json'
            },
            {
                name: 'bun',
                displayName: 'Bun',
                installCommand: 'bun install',
                initCommand: 'bun init -y',
                runCommand: 'bun run',
                testCommand: 'bun test',
                buildCommand: 'bun run build',
                devCommand: 'bun dev',
                configFile: 'package.json'
            }
        ],
        defaultCommands: {
            run: 'node',
            debug: 'node --inspect',
            format: 'prettier --write',
            lint: 'eslint'
        }
    },
    typescript: {
        name: 'typescript',
        displayName: 'TypeScript',
        extensions: ['.ts', '.tsx', '.d.ts'],
        icon: '🔷',
        color: '#3178C6',
        fileIcon: 'ts',
        packageManagers: [
            {
                name: 'npm',
                displayName: 'npm',
                installCommand: 'npm install',
                initCommand: 'npm init -y && npm install -D typescript @types/node',
                runCommand: 'npm run',
                testCommand: 'npm test',
                buildCommand: 'npm run build',
                devCommand: 'npm run dev',
                configFile: 'package.json'
            },
            {
                name: 'yarn',
                displayName: 'Yarn',
                installCommand: 'yarn',
                initCommand: 'yarn init -y && yarn add -D typescript @types/node',
                runCommand: 'yarn',
                testCommand: 'yarn test',
                buildCommand: 'yarn build',
                devCommand: 'yarn dev',
                configFile: 'package.json'
            }
        ],
        defaultCommands: {
            compile: 'tsc',
            run: 'ts-node',
            build: 'tsc --build',
            watch: 'tsc --watch'
        }
    },
    python: {
        name: 'python',
        displayName: 'Python',
        extensions: ['.py', '.pyw', '.pyi'],
        icon: '🐍',
        color: '#3776AB',
        fileIcon: 'py',
        packageManagers: [
            {
                name: 'pip',
                displayName: 'pip',
                installCommand: 'pip install',
                initCommand: 'pip install virtualenv && python -m venv venv',
                runCommand: 'python',
                testCommand: 'python -m pytest',
                configFile: 'requirements.txt'
            },
            {
                name: 'poetry',
                displayName: 'Poetry',
                installCommand: 'poetry install',
                initCommand: 'poetry init',
                runCommand: 'poetry run python',
                testCommand: 'poetry run pytest',
                configFile: 'pyproject.toml'
            },
            {
                name: 'conda',
                displayName: 'Conda',
                installCommand: 'conda install',
                initCommand: 'conda create -n myenv python',
                runCommand: 'python',
                testCommand: 'python -m pytest',
                configFile: 'environment.yml'
            }
        ],
        defaultCommands: {
            run: 'python',
            install: 'pip install',
            format: 'black',
            lint: 'flake8'
        }
    },
    rust: {
        name: 'rust',
        displayName: 'Rust',
        extensions: ['.rs'],
        icon: '🦀',
        color: '#CE422B',
        fileIcon: 'rs',
        packageManagers: [
            {
                name: 'cargo',
                displayName: 'Cargo',
                installCommand: 'cargo build',
                initCommand: 'cargo init',
                runCommand: 'cargo run',
                testCommand: 'cargo test',
                buildCommand: 'cargo build --release',
                configFile: 'Cargo.toml'
            }
        ],
        defaultCommands: {
            run: 'cargo run',
            build: 'cargo build',
            test: 'cargo test',
            format: 'cargo fmt',
            lint: 'cargo clippy'
        }
    },
    go: {
        name: 'go',
        displayName: 'Go',
        extensions: ['.go'],
        icon: '🐹',
        color: '#00ADD8',
        fileIcon: 'go',
        packageManagers: [
            {
                name: 'go-mod',
                displayName: 'Go Modules',
                installCommand: 'go mod download',
                initCommand: 'go mod init',
                runCommand: 'go run',
                testCommand: 'go test',
                buildCommand: 'go build',
                configFile: 'go.mod'
            }
        ],
        defaultCommands: {
            run: 'go run',
            build: 'go build',
            test: 'go test',
            format: 'go fmt',
            get: 'go get'
        }
    },
    java: {
        name: 'java',
        displayName: 'Java',
        extensions: ['.java', '.class', '.jar'],
        icon: '☕',
        color: '#ED8B00',
        fileIcon: 'java',
        packageManagers: [
            {
                name: 'maven',
                displayName: 'Maven',
                installCommand: 'mvn install',
                initCommand: 'mvn archetype:generate',
                runCommand: 'mvn exec:java',
                testCommand: 'mvn test',
                buildCommand: 'mvn package',
                configFile: 'pom.xml'
            },
            {
                name: 'gradle',
                displayName: 'Gradle',
                installCommand: 'gradle build',
                initCommand: 'gradle init',
                runCommand: 'gradle run',
                testCommand: 'gradle test',
                buildCommand: 'gradle build',
                configFile: 'build.gradle'
            }
        ],
        defaultCommands: {
            compile: 'javac',
            run: 'java',
            jar: 'jar'
        }
    },
    php: {
        name: 'php',
        displayName: 'PHP',
        extensions: ['.php', '.phtml'],
        icon: '🐘',
        color: '#777BB4',
        fileIcon: 'php',
        packageManagers: [
            {
                name: 'composer',
                displayName: 'Composer',
                installCommand: 'composer install',
                initCommand: 'composer init',
                runCommand: 'php',
                testCommand: 'composer test',
                configFile: 'composer.json'
            }
        ],
        defaultCommands: {
            run: 'php',
            serve: 'php -S localhost:8000',
            lint: 'php -l'
        }
    },
    ruby: {
        name: 'ruby',
        displayName: 'Ruby',
        extensions: ['.rb', '.rbw'],
        icon: '💎',
        color: '#CC342D',
        fileIcon: 'rb',
        packageManagers: [
            {
                name: 'gem',
                displayName: 'RubyGems',
                installCommand: 'gem install',
                runCommand: 'ruby',
                testCommand: 'ruby -e "require \'minitest/autorun\'"',
                configFile: 'Gemfile'
            },
            {
                name: 'bundler',
                displayName: 'Bundler',
                installCommand: 'bundle install',
                initCommand: 'bundle init',
                runCommand: 'bundle exec ruby',
                testCommand: 'bundle exec rake test',
                configFile: 'Gemfile'
            }
        ],
        defaultCommands: {
            run: 'ruby',
            irb: 'irb',
            gem: 'gem'
        }
    },
    cpp: {
        name: 'cpp',
        displayName: 'C++',
        extensions: ['.cpp', '.cc', '.cxx', '.c++', '.hpp', '.hh', '.hxx', '.h++'],
        icon: '⚙️',
        color: '#00599C',
        fileIcon: 'cpp',
        packageManagers: [
            {
                name: 'cmake',
                displayName: 'CMake',
                installCommand: 'cmake --install .',
                initCommand: 'cmake .',
                buildCommand: 'make',
                configFile: 'CMakeLists.txt'
            },
            {
                name: 'make',
                displayName: 'Make',
                installCommand: 'make install',
                buildCommand: 'make',
                configFile: 'Makefile'
            }
        ],
        defaultCommands: {
            compile: 'g++',
            debug: 'gdb',
            run: './a.out'
        }
    },
    c: {
        name: 'c',
        displayName: 'C',
        extensions: ['.c', '.h'],
        icon: '🔧',
        color: '#A8B9CC',
        fileIcon: 'c',
        packageManagers: [
            {
                name: 'make',
                displayName: 'Make',
                installCommand: 'make install',
                buildCommand: 'make',
                configFile: 'Makefile'
            }
        ],
        defaultCommands: {
            compile: 'gcc',
            debug: 'gdb',
            run: './a.out'
        }
    },
    json: {
        name: 'json',
        displayName: 'JSON',
        extensions: ['.json'],
        icon: '📄',
        color: '#292929',
        fileIcon: 'json',
        packageManagers: [],
        defaultCommands: {
            format: 'jq',
            validate: 'jsonlint'
        }
    },
    markdown: {
        name: 'markdown',
        displayName: 'Markdown',
        extensions: ['.md', '.markdown'],
        icon: '📝',
        color: '#083FA1',
        fileIcon: 'md',
        packageManagers: [],
        defaultCommands: {
            preview: 'markdown',
            convert: 'pandoc'
        }
    }
}

export function detectLanguageFromExtension(filename: string): LanguageInfo | null {
    const extension = getFileExtension(filename)

    for (const [_, language] of Object.entries(LANGUAGE_CONFIGS)) {
        if (language.extensions.includes(extension)) {
            return language
        }
    }

    return null
}

export function detectLanguageFromFilename(filename: string): LanguageInfo | null {
    // Special cases for specific filenames
    const specialFiles: Record<string, string> = {
        'package.json': 'javascript',
        'package-lock.json': 'javascript',
        'yarn.lock': 'javascript',
        'pnpm-lock.yaml': 'javascript',
        'bun.lockb': 'javascript',
        'tsconfig.json': 'typescript',
        'requirements.txt': 'python',
        'pyproject.toml': 'python',
        'Pipfile': 'python',
        'Cargo.toml': 'rust',
        'Cargo.lock': 'rust',
        'go.mod': 'go',
        'go.sum': 'go',
        'pom.xml': 'java',
        'build.gradle': 'java',
        'composer.json': 'php',
        'Gemfile': 'ruby',
        'CMakeLists.txt': 'cpp',
        'Makefile': 'c',
        'makefile': 'c'
    }

    const lowerFilename = filename.toLowerCase()

    if (specialFiles[lowerFilename]) {
        return LANGUAGE_CONFIGS[specialFiles[lowerFilename]]
    }

    return detectLanguageFromExtension(filename)
}

export function getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.')
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : ''
}

export function getLanguageIcon(filename: string): string {
    const language = detectLanguageFromFilename(filename)
    return language?.icon || '📄'
}

export function getLanguageColor(filename: string): string {
    const language = detectLanguageFromFilename(filename)
    return language?.color || '#666666'
}

export function getAvailableCommands(filename: string): Record<string, string> {
    const language = detectLanguageFromFilename(filename)
    return language?.defaultCommands || {}
}

export function getPackageManagers(filename: string): PackageManager[] {
    const language = detectLanguageFromFilename(filename)
    return language?.packageManagers || []
}

export function getAllSupportedLanguages(): LanguageInfo[] {
    return Object.values(LANGUAGE_CONFIGS)
}
