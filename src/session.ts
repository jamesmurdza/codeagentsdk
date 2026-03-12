import type { ProviderName, ProviderOptions, RunDefaults, RunOptions, Event } from "./types/index.js"
import { createProvider } from "./factory.js"
import type { Provider } from "./providers/base.js"

/** Options for createSession (provider options + run defaults like model, timeout). */
export interface SessionOptions extends ProviderOptions {
  model?: string
  sessionId?: string
  timeout?: number
  skipInstall?: boolean
  env?: Record<string, string>
}

/** Options for createBackgroundSession (session options + required outputFile path). */
export interface BackgroundSessionOptions extends SessionOptions {
  /**
   * Path to the JSONL log file inside the sandbox where the provider CLI
   * will append its stream-json events.
   */
  outputFile: string
}

/** Background session handle: start background runs and poll for events. */
export interface BackgroundSession {
  /** Underlying provider instance (advanced use only). */
  readonly provider: Provider
  /** JSONL log file path used for this background session. */
  readonly outputFile: string

  /**
   * Start a background run with the given prompt. Returns execution metadata
   * and the initial cursor for polling.
   */
  start(prompt: string, options?: Omit<RunOptions, "prompt">): Promise<{
    executionId: string
    pid: number
    outputFile: string
    cursor: string
  }>

  /**
   * Poll for new events since the last cursor. Events have the same shape
   * as those yielded by session.run().
   */
  poll(cursor?: string | null): Promise<{
    status: "running" | "completed"
    sessionId: string | null
    events: Event[]
    cursor: string
  }>
}

/**
 * Create a session: a provider with run defaults (model, timeout, env) set at creation.
 * Returns the provider; call session.run(prompt) with just the prompt string.
 */
export async function createSession(name: ProviderName, options: SessionOptions): Promise<Provider> {
  const { model, sessionId, timeout, skipInstall, env, ...providerOptions } = options
  const runDefaults: RunDefaults = { model, sessionId, timeout, skipInstall, env }
  const provider = createProvider(name, { ...providerOptions, skipInstall, env, runDefaults })
  await provider.ready
  return provider
}

/**
 * Create a background session: a provider configured for sandboxed background
 * execution with JSONL log polling. Use start() to launch a background run and
 * poll() to consume events incrementally.
 */
export async function createBackgroundSession(
  name: ProviderName,
  options: BackgroundSessionOptions
): Promise<BackgroundSession> {
  const { outputFile, ...sessionOptions } = options
  const provider = await createSession(name, sessionOptions)

  return {
    provider,
    outputFile,
    async start(prompt: string, extraOptions?: Omit<RunOptions, "prompt">) {
      const res = await provider.startSandboxBackground({
        ...(extraOptions ?? {}),
        prompt,
        outputFile,
      })
      return res
    },
    async poll(cursor?: string | null) {
      return provider.pollSandboxBackground(outputFile, cursor ?? null)
    },
  }
}
