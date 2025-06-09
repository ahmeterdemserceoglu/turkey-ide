'use client'

import { useState, useEffect } from 'react'
import {
  Github,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Download,
  Upload,
  Folder,
  User,
  Settings,
  Search,
  Star,
  Eye,
  Calendar,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useIDEStore } from '@/store/ide-store'
import { useGitHubStore, type Repository } from '@/store/github-store'
import { githubService } from '@/services/github-service'

export function GitHubPanel() {
  const { isGithubConnected, setGithubConnection } = useIDEStore()
  const {
    token,
    user,
    repositories,
    selectedRepo,
    branches,
    currentBranch,
    setToken,
    setUser,
    setRepositories,
    setSelectedRepo,
    setBranches,
    setCurrentBranch,
    clearAuth
  } = useGitHubStore()

  const [tokenInput, setTokenInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [cloneUrl, setCloneUrl] = useState('')
  const [showCloneDialog, setShowCloneDialog] = useState(false)

  // Check for GitHub token in URL (after OAuth redirect)
  useEffect(() => {
    const token = githubService.parseTokenFromUrl()
    if (token) {
      setIsLoading(true)
      githubService.setToken(token)

      // Fetch user data
      githubService.validateToken()
        .then(userData => {
          setToken(token)
          setUser(userData)
          setGithubConnection(true)
          return loadRepositories()
        })
        .catch(error => {
          console.error('GitHub auth error:', error)
          alert('Failed to authenticate with GitHub.')
          githubService.clearToken()
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [])

  // Authenticate with GitHub
  const handleAuth = async () => {
    if (!tokenInput) return

    setIsLoading(true)
    try {
      githubService.setToken(tokenInput)
      const userData = await githubService.validateToken()

      setToken(tokenInput)
      setUser(userData)
      setGithubConnection(true)
      await loadRepositories()
    } catch (error) {
      console.error('GitHub auth error:', error)
      alert('Failed to authenticate with GitHub. Please check your token.')
    } finally {
      setIsLoading(false)
    }
  }

  // Load user repositories
  const loadRepositories = async () => {
    try {
      const repos = await githubService.getUserRepositories()
      setRepositories(repos)
    } catch (error) {
      console.error('Error loading repositories:', error)
    }
  }

  // Load repository branches
  const loadBranches = async (repoFullName: string) => {
    try {
      const [owner, repoName] = repoFullName.split('/')
      const branchList = await githubService.getBranches(owner, repoName)
      setBranches(branchList)

      // Set default branch as current
      const repo = repositories.find(r => r.full_name === repoFullName)
      if (repo) {
        setCurrentBranch(repo.default_branch)
      }
    } catch (error) {
      console.error('Error loading branches:', error)
    }
  }

  // Clone repository
  const handleCloneRepo = async (repo: Repository) => {
    setIsLoading(true)
    try {
      setSelectedRepo(repo)
      await loadBranches(repo.full_name)

      // Clone the repository and load files
      const [owner, repoName] = repo.full_name.split('/')
      const cloneData = await githubService.cloneRepository(owner, repoName, repo.default_branch)

      // Convert GitHub tree to our file tree format
      // biome-ignore lint/suspicious/noExplicitAny: GitHub API tree structure varies
      const convertGitHubTreeToFileTree = (tree: any[]) => {
        // Create structure with project directly at the root level
        const projectFolder = {
          id: `repo-${repo.name}`,
          name: repo.name,
          type: 'folder' as const,
          path: `/${repo.name}`,
          isExpanded: true,
          children: []
        }

        // Build tree structure
        const pathMap = new Map()

        // Add project node
        pathMap.set('', projectFolder)

        // Sort tree items by path to process directories first
        const sortedTree = tree.sort((a, b) => {
          if (a.type === 'tree' && b.type === 'blob') return -1
          if (a.type === 'blob' && b.type === 'tree') return 1
          return a.path.localeCompare(b.path)
        })

        for (const item of sortedTree) {
          const pathParts = item.path.split('/')
          const fileName = pathParts[pathParts.length - 1]
          const parentPath = pathParts.slice(0, -1).join('/')

          const node = {
            id: `github-${item.sha}`,
            name: fileName,
            type: item.type === 'tree' ? 'folder' as const : 'file' as const,
            path: `/${repo.name}/${item.path}`,
            githubPath: item.path,
            isExpanded: false,
            children: item.type === 'tree' ? [] : undefined,
            content: item.type === 'blob' ? '' : undefined // Will be loaded on demand
          }

          // Find or create parent
          let parent = pathMap.get(parentPath)
          if (!parent && parentPath !== '') {
            // Create missing parent directories
            const parentParts = parentPath.split('/')
            let currentPath = ''
            for (const part of parentParts) {
              const prevPath = currentPath
              currentPath = currentPath ? `${currentPath}/${part}` : part

              if (!pathMap.has(currentPath)) {
                const parentDir = {
                  id: `github-dir-${currentPath}`,
                  name: part,
                  type: 'folder' as const,
                  path: `/${repo.name}/${currentPath}`,
                  isExpanded: false,
                  children: []
                }
                pathMap.set(currentPath, parentDir)

                const grandParent = pathMap.get(prevPath)
                if (grandParent?.children) {
                  grandParent.children.push(parentDir)
                }
              }
            }
            parent = pathMap.get(parentPath)
          }

          pathMap.set(item.path, node)

          if (parent?.children) {
            parent.children.push(node)
          }
        }

        // Store in localStorage for persistence
        try {
          // Store repository information
          const repoInfo = {
            name: repo.name,
            fullName: repo.full_name,
            branch: repo.default_branch,
            lastAccessed: new Date().toISOString()
          };

          // Get existing repos or initialize empty array
          const storedRepos = JSON.parse(localStorage.getItem('github-repos') || '[]');

          // Update or add repo
          const existingIndex = storedRepos.findIndex((r: any) => r.name === repo.name);
          if (existingIndex >= 0) {
            storedRepos[existingIndex] = repoInfo;
          } else {
            storedRepos.push(repoInfo);
          }

          // Save back to localStorage
          localStorage.setItem('github-repos', JSON.stringify(storedRepos));

          // Store path structure
          localStorage.setItem(`github-repo-${repo.name}-structure`, JSON.stringify(projectFolder));
        } catch (error) {
          console.error('Failed to store repository data in localStorage:', error);
        }

        return [projectFolder]
      }

      const fileTree = convertGitHubTreeToFileTree(cloneData.tree)

      // Update IDE file tree
      const { setFileTree, setTerminalCwd } = useIDEStore.getState()
      setFileTree(fileTree)

      // Set terminal's current working directory to the project root
      // This ensures all terminals start in the project directory
      setTerminalCwd(`/${repo.name}`)

      // Also update any active terminals to use the new project directory
      const { terminals } = useIDEStore.getState();
      if (terminals && terminals.length > 0) {
        // For each terminal, make sure it's pointing to the project
        console.log(`Setting all terminals to project: /${repo.name}`);
      }

      alert(`Repository ${repo.name} cloned successfully! Check the file explorer. Terminals are set to project root.`)
    } catch (error) {
      console.error('Error cloning repository:', error)
      alert('Failed to clone repository')
    } finally {
      setIsLoading(false)
    }
  }

  // Clone from URL
  const handleCloneFromUrl = async () => {
    if (!cloneUrl) return

    setIsLoading(true)
    try {
      // Extract owner and repo from URL
      const match = cloneUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/)
      if (!match) {
        throw new Error('Invalid GitHub URL')
      }

      const [, owner, repoName] = match
      const repo = await githubService.getRepository(owner, repoName)

      await handleCloneRepo(repo)
      setShowCloneDialog(false)
      setCloneUrl('')
    } catch (error) {
      console.error('Error cloning from URL:', error)
      alert('Failed to clone repository from URL')
    } finally {
      setIsLoading(false)
    }
  }

  // Logout
  const handleLogout = () => {
    githubService.clearToken()
    clearAuth()
    setGithubConnection(false)
    setTokenInput('')

    // Clear GitHub data from localStorage
    try {
      // Get the list of repositories
      const storedReposString = localStorage.getItem('github-repos');
      if (storedReposString) {
        const storedRepos = JSON.parse(storedReposString);

        // Remove each repository structure
        for (const repo of storedRepos) {
          localStorage.removeItem(`github-repo-${repo.name}-structure`);
        }

        // Remove the repositories list
        localStorage.removeItem('github-repos');
      }

      console.log('GitHub data cleared from localStorage');
    } catch (error) {
      console.error('Error clearing GitHub data from localStorage:', error);
    }
  }

  // Filter repositories
  const filteredRepos = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Render login screen if not authenticated
  if (!token) {
    return (
      <div className="h-full bg-background border-r flex flex-col">
        <div className="flex items-center justify-between p-3 border-b">
          <h2 className="font-semibold text-sm">GITHUB</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm mx-auto space-y-4">
            <div className="text-center space-y-2 mb-6">
              <Github className="w-12 h-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">Connect to GitHub</h3>
              <p className="text-sm text-muted-foreground">
                Sign in with your GitHub account to access your repositories
              </p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/github')
                    const data = await response.json()

                    if (data.authUrl) {
                      // Redirect to GitHub auth
                      window.location.href = data.authUrl
                    }
                  } catch (error) {
                    console.error('Failed to initiate GitHub auth:', error)
                    alert('Failed to connect to GitHub')
                  }
                }}
                className="w-full"
                disabled={isLoading}
              >
                <Github className="w-4 h-4 mr-2" />
                {isLoading ? 'Connecting...' : 'Sign in with GitHub'}
              </Button>

              <Separator className="my-4">
                <span className="px-2 text-xs text-muted-foreground">OR</span>
              </Separator>

              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Enter GitHub Personal Access Token"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Token needs 'repo' scope permissions
                </p>
              </div>

              <Button
                onClick={handleAuth}
                className="w-full"
                disabled={!tokenInput || isLoading}
                variant="outline"
              >
                {isLoading ? 'Connecting...' : 'Connect with Token'}
              </Button>
            </div>

            <div className="mt-6 text-xs text-muted-foreground">
              <p className="mb-2">To create a Personal Access Token:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to GitHub Settings → Developer settings</li>
                <li>Click "Personal access tokens" → "Tokens (classic)"</li>
                <li>Generate new token with "repo" scope</li>
                <li>
                  <a
                    href="https://github.com/settings/tokens/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80 inline-flex items-center"
                  >
                    Create token directly
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-background border-r flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <h2 className="font-semibold text-sm">GITHUB</h2>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="repos" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-3 mt-2">
          <TabsTrigger value="repos">Repos</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="commits">Commits</TabsTrigger>
        </TabsList>

        <TabsContent value="repos" className="flex-1 p-3 space-y-3">
          {/* User Info */}
          {user && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <img
                    src={user.avatar_url}
                    alt={user.login}
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <p className="text-sm font-medium">{user.name || user.login}</p>
                    <p className="text-xs text-muted-foreground">@{user.login}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search and Clone */}
          <div className="space-y-2">
            <Input
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8"
            />
            <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Clone Repository
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clone Repository</DialogTitle>
                  <DialogDescription>
                    Enter a GitHub repository URL to clone
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="https://github.com/owner/repo"
                    value={cloneUrl}
                    onChange={(e) => setCloneUrl(e.target.value)}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowCloneDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCloneFromUrl} disabled={!cloneUrl || isLoading}>
                      {isLoading ? 'Cloning...' : 'Clone'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Repository List */}
          <div className="flex-1 overflow-auto space-y-2">
            {filteredRepos.map((repo) => (
              <Card key={repo.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">{repo.name}</h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {repo.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex space-x-1 ml-2">
                      <Badge variant={repo.private ? "secondary" : "outline"} className="text-xs">
                        {repo.private ? 'Private' : 'Public'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-3">
                      {repo.language && (
                        <span className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mr-1" />
                          {repo.language}
                        </span>
                      )}
                      <span className="flex items-center">
                        <Star className="w-3 h-3 mr-1" />
                        {repo.stargazers_count}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => handleCloneRepo(repo)}
                      disabled={isLoading}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="branches" className="flex-1 p-3">
          {selectedRepo ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">{selectedRepo.name}</h3>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {branches.length} branches
                  </Badge>
                  <Button variant="outline" size="sm" className="h-6 px-2">
                    <GitBranch className="w-3 h-3 mr-1" />
                    New
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {branches.map((branch) => (
                  <div
                    key={branch.name}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-accent/50 ${branch.name === currentBranch ? 'bg-accent' : ''
                      }`}
                    onClick={() => setCurrentBranch(branch.name)}
                  >
                    <div className="flex items-center space-x-2">
                      <GitBranch className="w-4 h-4" />
                      <span className="text-sm">{branch.name}</span>
                    </div>
                    {branch.name === currentBranch && (
                      <Badge variant="default" className="text-xs">Current</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <div className="text-center">
                <GitBranch className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Select a repository to view branches</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="commits" className="flex-1 p-3">
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <GitCommit className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Commit history coming soon...</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
