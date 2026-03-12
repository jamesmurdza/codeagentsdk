import { Daytona, Sandbox } from "@daytonaio/sdk"
import type { ProviderName, SandboxConfig } from "../types/index.js"
import { getPackageName } from "../utils/install.js"

// Re-export SandboxConfig from types
export type { SandboxConfig } from "../types/index.js"

/**
 * Manages a Daytona sandbox for secure CLI execution
 */
export class SandboxManager {
  private daytona: Daytona
  private _sandbox: Sandbox | null = null
  private config: SandboxConfig
  private envVars: Record<string, string> = {}

  constructor(config: SandboxConfig = {}) {
    this.config = config
    this.daytona = new Daytona({
      apiKey: config.apiKey,
      serverUrl: config.serverUrl,
      target: config.target,
    })
    if (config.env) {
      this.envVars = { ...config.env }
    }
  }

  /**
   * Get the underlying Daytona Sandbox instance
   */
  get sandbox(): Sandbox | null {
    return this._sandbox
  }

  /**
   * Create the sandbox instance
   */
  async create(): Promise<Sandbox> {
    if (!this._sandbox) {
      this._sandbox = await this.daytona.create({
        language: "typescript",
        envVars: this.config.env,
        autoStopInterval: this.config.autoStopTimeout,
      })
    }
    return this._sandbox
  }

  /**
   * Install a provider CLI in the sandbox
   */
  async installProvider(name: ProviderName): Promise<boolean> {
    const sandbox = await this.create()
    const packageName = getPackageName(name)

    try {
      const result = await sandbox.process.executeCommand(
        `npm install -g ${packageName}`,
        undefined,
        undefined,
        120
      )
      return result.exitCode === 0
    } catch {
      return false
    }
  }

  /**
   * Check if a provider CLI is installed in the sandbox
   */
  async isProviderInstalled(name: ProviderName): Promise<boolean> {
    const sandbox = await this.create()

    try {
      const result = await sandbox.process.executeCommand(`which ${name}`)
      return result.exitCode === 0
    } catch {
      return false
    }
  }

  /**
   * Ensure a provider CLI is installed, installing if necessary
   */
  async ensureProvider(name: ProviderName): Promise<void> {
    const installed = await this.isProviderInstalled(name)
    if (!installed) {
      console.log(`Installing ${name} CLI in sandbox...`)
      const success = await this.installProvider(name)
      if (!success) {
        throw new Error(`Failed to install ${name} CLI in sandbox`)
      }
      console.log(`Installed ${name} CLI`)
    }
  }

  /**
   * Execute a command in the sandbox
   */
  async executeCommand(
    command: string,
    timeout: number = 60
  ): Promise<{ exitCode: number; output: string }> {
    const sandbox = await this.create()

    // Build env string prefix
    const envPrefix = Object.entries(this.envVars)
      .map(([k, v]) => `${k}='${v.replace(/'/g, "'\\''")}'`)
      .join(" ")

    const fullCommand = envPrefix ? `${envPrefix} ${command}` : command

    const result = await sandbox.process.executeCommand(
      fullCommand,
      undefined,
      undefined,
      timeout
    )

    return {
      exitCode: result.exitCode ?? 0,
      output: result.result ?? "",
    }
  }

  /**
   * Execute a command and stream output line by line
   */
  async *executeCommandStream(
    command: string,
    timeout: number = 120
  ): AsyncGenerator<string, void, unknown> {
    // For now, execute the full command and yield lines
    // Future: Use Daytona's streaming API when available
    const result = await this.executeCommand(command, timeout)

    // Split output into lines and yield each
    const lines = result.output.split("\n")
    for (const line of lines) {
      if (line.trim()) {
        yield line
      }
    }
  }

  /**
   * Set environment variable for future commands
   */
  setEnv(name: string, value: string): void {
    this.envVars[name] = value
  }

  /**
   * Set multiple environment variables
   */
  setEnvVars(vars: Record<string, string>): void {
    Object.assign(this.envVars, vars)
  }

  /**
   * Cleanup and destroy the sandbox
   */
  async destroy(): Promise<void> {
    if (this._sandbox) {
      try {
        await this._sandbox.delete()
      } catch {
        // Ignore errors when deleting sandbox
      }
      this._sandbox = null
    }
  }
}

/**
 * Create a sandbox manager with the given configuration
 */
export function createSandbox(config?: SandboxConfig): SandboxManager {
  return new SandboxManager(config)
}
