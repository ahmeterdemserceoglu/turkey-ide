import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface GitHubUser {
  id: number
  login: string
  name: string | null
  email: string | null
  avatar_url: string
  html_url: string
  public_repos: number
  followers: number
  following: number
}

export interface Repository {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  html_url: string
  clone_url: string
  ssh_url: string
  default_branch: string
  stargazers_count: number
  watchers_count: number
  forks_count: number
  language: string | null
  updated_at: string
  created_at: string
  owner: {
    login: string
    avatar_url: string
  }
}

export interface Branch {
  name: string
  commit: {
    sha: string
    url: string
  }
  protected: boolean
}

export interface Commit {
  sha: string
  commit: {
    author: {
      name: string
      email: string
      date: string
    }
    message: string
  }
  author: {
    login: string
    avatar_url: string
  } | null
  html_url: string
}

export interface PullRequest {
  id: number
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed' | 'merged'
  user: {
    login: string
    avatar_url: string
  }
  created_at: string
  updated_at: string
  html_url: string
  head: {
    ref: string
    sha: string
  }
  base: {
    ref: string
    sha: string
  }
}

interface GitHubState {
  // Authentication
  token: string | null
  user: GitHubUser | null
  isAuthenticated: boolean

  // Repositories
  repositories: Repository[]
  selectedRepo: Repository | null

  // Branches
  branches: Branch[]
  currentBranch: string | null

  // Commits
  commits: Commit[]

  // Pull Requests
  pullRequests: PullRequest[]

  // Loading states
  isLoading: boolean
  error: string | null

  // Actions
  setToken: (token: string) => void
  setUser: (user: GitHubUser) => void
  setRepositories: (repos: Repository[]) => void
  setSelectedRepo: (repo: Repository | null) => void
  setBranches: (branches: Branch[]) => void
  setCurrentBranch: (branch: string) => void
  setCommits: (commits: Commit[]) => void
  setPullRequests: (prs: PullRequest[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearAuth: () => void
  addRepository: (repo: Repository) => void
  updateRepository: (repoId: number, updates: Partial<Repository>) => void
  removeRepository: (repoId: number) => void
}

export const useGitHubStore = create<GitHubState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        token: null,
        user: null,
        isAuthenticated: false,

        repositories: [],
        selectedRepo: null,

        branches: [],
        currentBranch: null,

        commits: [],
        pullRequests: [],

        isLoading: false,
        error: null,

        // Actions
        setToken: (token) => set({
          token,
          isAuthenticated: !!token
        }),

        setUser: (user) => set({ user }),

        setRepositories: (repositories) => set({ repositories }),

        setSelectedRepo: (selectedRepo) => set({ selectedRepo }),

        setBranches: (branches) => set({ branches }),

        setCurrentBranch: (currentBranch) => set({ currentBranch }),

        setCommits: (commits) => set({ commits }),

        setPullRequests: (pullRequests) => set({ pullRequests }),

        setLoading: (isLoading) => set({ isLoading }),

        setError: (error) => set({ error }),

        clearAuth: () => set({
          token: null,
          user: null,
          isAuthenticated: false,
          repositories: [],
          selectedRepo: null,
          branches: [],
          currentBranch: null,
          commits: [],
          pullRequests: [],
          error: null
        }),

        addRepository: (repo) => set((state) => ({
          repositories: [repo, ...state.repositories]
        })),

        updateRepository: (repoId, updates) => set((state) => ({
          repositories: state.repositories.map(repo =>
            repo.id === repoId ? { ...repo, ...updates } : repo
          )
        })),

        removeRepository: (repoId) => set((state) => ({
          repositories: state.repositories.filter(repo => repo.id !== repoId),
          selectedRepo: state.selectedRepo?.id === repoId ? null : state.selectedRepo
        }))
      }),
      {
        name: 'github-storage',
        partialize: (state) => ({
          token: state.token,
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          repositories: state.repositories,
          selectedRepo: state.selectedRepo,
        })
      }
    )
  )
)
