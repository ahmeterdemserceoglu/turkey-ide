import { Octokit } from '@octokit/rest'
import type { Repository, Branch, Commit, PullRequest, GitHubUser } from '@/store/github-store'

export class GitHubService {
  private octokit: Octokit | null = null
  private token: string | null = null

  constructor(token?: string) {
    if (token) {
      this.setToken(token)
    }

    // Check for stored token in localStorage
    this.initFromStorage()
  }

  private initFromStorage() {
    if (typeof window !== 'undefined') {
      try {
        const storedToken = localStorage.getItem('github_token')
        if (storedToken && !this.token) {
          this.setToken(storedToken)
        }
      } catch (error) {
        console.error('Failed to initialize from storage:', error)
      }
    }
  }

  setToken(token: string) {
    this.token = token
    this.octokit = new Octokit({
      auth: token,
    })

    // Save token to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('github_token', token)
    }
  }

  clearToken() {
    this.token = null
    this.octokit = null

    // Remove from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('github_token')
    }
  }

  // OAuth flow
  getAuthUrl() {
    return '/api/github'
  }

  // Parse token from URL after OAuth callback
  parseTokenFromUrl() {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const token = params.get('github_token')

      if (token) {
        // Clean URL
        const cleanUrl = window.location.href.split('?')[0]
        window.history.replaceState({}, document.title, cleanUrl)

        return token
      }
    }
    return null
  }

  private ensureAuth() {
    if (!this.octokit || !this.token) {
      throw new Error('GitHub token not set. Please authenticate first.')
    }
    return this.octokit
  }

  // Authentication
  async validateToken(): Promise<GitHubUser> {
    const octokit = this.ensureAuth()

    try {
      const { data } = await octokit.rest.users.getAuthenticated()
      return data as GitHubUser
    } catch (error) {
      throw new Error('Invalid GitHub token')
    }
  }

  // Repository operations
  async getUserRepositories(page = 1, perPage = 50): Promise<Repository[]> {
    const octokit = this.ensureAuth()

    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      direction: 'desc',
      per_page: perPage,
      page,
    })

    return data as Repository[]
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    const octokit = this.ensureAuth()

    const { data } = await octokit.rest.repos.get({
      owner,
      repo,
    })

    return data as Repository
  }

  async searchRepositories(query: string, page = 1, perPage = 30): Promise<Repository[]> {
    const octokit = this.ensureAuth()

    const { data } = await octokit.rest.search.repos({
      q: query,
      sort: 'updated',
      order: 'desc',
      per_page: perPage,
      page,
    })

    return data.items as Repository[]
  }

  // Branch operations
  async getBranches(owner: string, repo: string): Promise<Branch[]> {
    const octokit = this.ensureAuth()

    const { data } = await octokit.rest.repos.listBranches({
      owner,
      repo,
    })

    return data as Branch[]
  }

  async createBranch(owner: string, repo: string, branchName: string, fromBranch: string) {
    const octokit = this.ensureAuth()

    // Get the SHA of the source branch
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    })

    // Create new branch
    return await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha,
    })
  }

  // Commit operations
  async getCommits(owner: string, repo: string, branch?: string, page = 1, perPage = 30): Promise<Commit[]> {
    const octokit = this.ensureAuth()

    const { data } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: branch,
      per_page: perPage,
      page,
    })

    return data as Commit[]
  }

  // File operations
  async getFileContent(owner: string, repo: string, path: string, branch?: string): Promise<string> {
    const octokit = this.ensureAuth()

    try {
      // Normalize path by removing any leading slashes
      const normalizedPath = path.replace(/^\/+/, '');

      console.log(`Fetching GitHub file: ${owner}/${repo}/${normalizedPath} (branch: ${branch || 'default'})`);

      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: normalizedPath,
        ref: branch,
      })

      if ('content' in data && data.content) {
        return atob(data.content.replace(/\s/g, ''))
      }

      throw new Error('File content not found in response')
    } catch (error: unknown) {
      // Handle specific GitHub API errors
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        throw new Error(`File not found: ${path}`)
      }

      console.error('GitHub API error:', error);

      // Extract message from error object if available
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get file content: ${errorMessage}`)
    }
  }

  async getDirectoryContents(owner: string, repo: string, path = '', branch?: string) {
    const octokit = this.ensureAuth()

    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    })

    return Array.isArray(data) ? data : [data]
  }

  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch?: string,
    sha?: string
  ) {
    const octokit = this.ensureAuth()

    return await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: btoa(content), // Base64 encode
      branch,
      sha, // Required for updates
    })
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    sha: string,
    branch?: string
  ) {
    const octokit = this.ensureAuth()

    return await octokit.rest.repos.deleteFile({
      owner,
      repo,
      path,
      message,
      sha,
      branch,
    })
  }

  // Push changes to GitHub
  async pushChanges(
    owner: string,
    repo: string,
    files: Array<{
      path: string,
      content: string,
      sha?: string // Existing file SHA for updates
    }>,
    branch = 'main',
    commitMessage = 'Update from Turkish IDE'
  ): Promise<{ success: boolean, message: string }> {
    try {
      const octokit = this.ensureAuth();
      let success = true;
      let errorFiles: string[] = [];

      // Get the latest commit SHA of the branch
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`
      });
      const latestCommitSha = refData.object.sha;

      // Process each file
      for (const file of files) {
        try {
          // Check if file exists to get SHA
          let fileSha = file.sha;
          if (!fileSha) {
            try {
              const { data: fileData } = await octokit.repos.getContent({
                owner,
                repo,
                path: file.path,
                ref: branch
              });
              if ('sha' in fileData) {
                fileSha = fileData.sha;
              }
            } catch (fileError) {
              // File doesn't exist, will be created
            }
          }

          // Create or update file
          await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: file.path,
            message: commitMessage,
            content: btoa(file.content), // Base64 encode content
            branch,
            sha: fileSha // Include SHA for update, omit for create
          });
        } catch (fileError) {
          console.error(`Error pushing file ${file.path}:`, fileError);
          success = false;
          errorFiles.push(file.path);
        }
      }

      if (success) {
        return {
          success: true,
          message: `Successfully pushed ${files.length} files to ${owner}/${repo}:${branch}`
        };
      } else {
        return {
          success: false,
          message: `Failed to push some files: ${errorFiles.join(', ')}`
        };
      }
    } catch (error: unknown) {
      console.error('Error in pushChanges:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Push failed: ${errorMessage}`
      };
    }
  }

  // Pull Request operations
  async getPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<PullRequest[]> {
    const octokit = this.ensureAuth()

    const { data } = await octokit.rest.pulls.list({
      owner,
      repo,
      state,
      sort: 'updated',
      direction: 'desc',
    })

    return data as PullRequest[]
  }

  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
    body?: string
  ) {
    const octokit = this.ensureAuth()

    return await octokit.rest.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body,
    })
  }

  // Clone repository (get file tree)
  async cloneRepository(owner: string, repo: string, branch?: string) {
    const octokit = this.ensureAuth()

    try {
      // Get repository info
      const repoInfo = await this.getRepository(owner, repo)

      // Get the file tree
      const { data: tree } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: branch || repoInfo.default_branch,
        recursive: 'true',
      })

      return {
        repository: repoInfo,
        tree: tree.tree,
      }
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error}`)
    }
  }

  // Get repository statistics
  async getRepositoryStats(owner: string, repo: string) {
    const octokit = this.ensureAuth()

    const [languages, contributors, releases] = await Promise.all([
      octokit.rest.repos.listLanguages({ owner, repo }),
      octokit.rest.repos.listContributors({ owner, repo, per_page: 10 }),
      octokit.rest.repos.listReleases({ owner, repo, per_page: 5 }),
    ])

    return {
      languages: languages.data,
      contributors: contributors.data,
      releases: releases.data,
    }
  }
}

// Singleton instance
export const githubService = new GitHubService()
