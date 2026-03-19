/**
 * Integration tests for all providers - background and streaming modes.
 *
 * These tests create real Daytona sandboxes and run actual provider CLIs.
 * Skip when required API keys are not set.
 *
 * Required env vars per provider:
 *   - claude: DAYTONA_API_KEY, ANTHROPIC_API_KEY
 *   - codex: DAYTONA_API_KEY, OPENAI_API_KEY
 *   - gemini: DAYTONA_API_KEY, GEMINI_API_KEY (or GOOGLE_API_KEY)
 *   - opencode: DAYTONA_API_KEY, ANTHROPIC_API_KEY (or OPENAI_API_KEY)
 *
 * Run all:
 *   DAYTONA_API_KEY=... ANTHROPIC_API_KEY=... npm test -- tests/integration/providers.test.ts
 */
import "dotenv/config"
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { Daytona, type Sandbox } from "@daytonaio/sdk"
import { createSession, createBackgroundSession, type Event } from "../../src/index.js"

const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

// Simple prompt that should complete quickly
const SIMPLE_PROMPT = "What is 2 + 2? Reply with just the number."

// Provider configurations
const providers = [
  {
    name: "claude" as const,
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    apiKey: ANTHROPIC_API_KEY,
    hasKey: !!ANTHROPIC_API_KEY,
  },
  {
    name: "codex" as const,
    apiKeyEnvVar: "OPENAI_API_KEY",
    apiKey: OPENAI_API_KEY,
    hasKey: !!OPENAI_API_KEY,
  },
  {
    name: "gemini" as const,
    apiKeyEnvVar: "GEMINI_API_KEY",
    apiKey: GEMINI_API_KEY,
    hasKey: !!GEMINI_API_KEY,
  },
  {
    name: "opencode" as const,
    apiKeyEnvVar: "ANTHROPIC_API_KEY", // opencode can use multiple, we use anthropic
    apiKey: ANTHROPIC_API_KEY,
    hasKey: !!ANTHROPIC_API_KEY,
    model: "anthropic:claude-sonnet-4-20250514",
  },
]

// Helper to poll for completion
async function pollUntilEnd(
  bg: Awaited<ReturnType<typeof createBackgroundSession>>,
  timeoutMs = 120_000,
  pollIntervalMs = 2000
): Promise<Event[]> {
  const deadline = Date.now() + timeoutMs
  let allEvents: Event[] = []

  console.log(`[pollUntilEnd] Starting poll, timeout=${timeoutMs}ms, interval=${pollIntervalMs}ms`)

  while (Date.now() < deadline) {
    const { events } = await bg.getEvents()
    allEvents = events
    console.log(`[pollUntilEnd] Received ${events.length} events, types: ${events.map(e => e.type).join(', ')}`)
    if (events.some((e) => e.type === "end")) {
      console.log(`[pollUntilEnd] Found end event, stopping poll`)
      break
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs))
  }

  console.log(`[pollUntilEnd] Final event count: ${allEvents.length}`)
  return allEvents
}

// Helper to collect streaming events
async function collectStreamEvents(
  session: Awaited<ReturnType<typeof createSession>>,
  prompt: string
): Promise<Event[]> {
  const events: Event[] = []
  console.log(`[collectStreamEvents] Starting to collect events for prompt: "${prompt}"`)
  for await (const event of session.run(prompt)) {
    console.log(`[collectStreamEvents] Received event: type=${event.type}`)
    events.push(event)
  }
  console.log(`[collectStreamEvents] Collected ${events.length} total events, types: ${events.map(e => e.type).join(', ')}`)
  return events
}

describe.skipIf(!DAYTONA_API_KEY)("provider integration tests", () => {
  // Test each provider
  for (const provider of providers) {
    const hasRequiredKeys = DAYTONA_API_KEY && provider.hasKey

    describe.skipIf(!hasRequiredKeys)(`${provider.name}`, () => {
      let daytona: Daytona
      let sandbox: Sandbox

      beforeAll(async () => {
        daytona = new Daytona({ apiKey: DAYTONA_API_KEY! })
        sandbox = await daytona.create({
          envVars: { [provider.apiKeyEnvVar]: provider.apiKey! },
        })
      }, 60_000)

      afterAll(async () => {
        if (sandbox) {
          await sandbox.delete()
        }
      }, 30_000)

      describe("background mode", () => {
        it("completes a simple prompt and returns events", async () => {
          console.log(`[${provider.name}] Creating background session`)
          const bg = await createBackgroundSession(provider.name, {
            sandbox: sandbox as any,
            timeout: 120,
            model: provider.model,
            env: { [provider.apiKeyEnvVar]: provider.apiKey! },
          })

          console.log(`[${provider.name}] Starting with prompt: "${SIMPLE_PROMPT}"`)
          const startResult = await bg.start(SIMPLE_PROMPT)
          console.log(`[${provider.name}] Started with PID=${startResult.pid}, outputFile=${startResult.outputFile}`)

          expect(startResult.pid).toBeGreaterThan(0)
          expect(startResult.outputFile).toBeDefined()

          const events = await pollUntilEnd(bg)
          console.log(`[${provider.name}] Event types received: ${events.map(e => e.type).join(', ')}`)

          expect(events.length).toBeGreaterThan(0)
          expect(events.some((e) => e.type === "end")).toBe(true)
          // Should have some token events with the answer
          expect(events.some((e) => e.type === "token")).toBe(true)
        }, 180_000)

        it("isRunning transitions from true to false", async () => {
          const bg = await createBackgroundSession(provider.name, {
            sandbox: sandbox as any,
            timeout: 120,
            model: provider.model,
            env: { [provider.apiKeyEnvVar]: provider.apiKey! },
          })

          await bg.start(SIMPLE_PROMPT)

          // Should be running right after start
          const runningAfterStart = await bg.isRunning()
          expect(runningAfterStart).toBe(true)

          // Wait for completion
          await pollUntilEnd(bg)

          // Should not be running after completion
          const runningAfterEnd = await bg.isRunning()
          expect(runningAfterEnd).toBe(false)
        }, 180_000)

        it("getPid returns pid while running, null after", async () => {
          const bg = await createBackgroundSession(provider.name, {
            sandbox: sandbox as any,
            timeout: 120,
            model: provider.model,
            env: { [provider.apiKeyEnvVar]: provider.apiKey! },
          })

          const { pid: startPid } = await bg.start(SIMPLE_PROMPT)
          const getPidResult = await bg.getPid()
          expect(getPidResult).toBe(startPid)

          await pollUntilEnd(bg)

          const pidAfterEnd = await bg.getPid()
          expect(pidAfterEnd).toBeNull()
        }, 180_000)
      })

      describe("streaming mode", () => {
        it("streams events for a simple prompt", async () => {
          console.log(`[${provider.name}] Creating streaming session`)
          const session = await createSession(provider.name, {
            sandbox: sandbox as any,
            timeout: 120,
            model: provider.model,
            env: { [provider.apiKeyEnvVar]: provider.apiKey! },
          })

          const events = await collectStreamEvents(session, SIMPLE_PROMPT)
          console.log(`[${provider.name}] Collected event types: ${events.map(e => e.type).join(', ')}`)

          expect(events.length).toBeGreaterThan(0)
          expect(events.some((e) => e.type === "end")).toBe(true)
          expect(events.some((e) => e.type === "token")).toBe(true)
        }, 180_000)

        it("yields session event with id", async () => {
          const session = await createSession(provider.name, {
            sandbox: sandbox as any,
            timeout: 120,
            model: provider.model,
            env: { [provider.apiKeyEnvVar]: provider.apiKey! },
          })

          const events = await collectStreamEvents(session, SIMPLE_PROMPT)

          const sessionEvent = events.find((e) => e.type === "session")
          expect(sessionEvent).toBeDefined()
          expect((sessionEvent as any).id).toBeDefined()
        }, 180_000)
      })
    })
  }
})
