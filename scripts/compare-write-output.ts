#!/usr/bin/env npx tsx
/**
 * Run Claude and Codex with the same write-file prompt and compare normalized event output.
 * Exit 0 if same, 1 if different.
 */
import { createSandbox, createProvider } from "../src/index.js"
import type { Event } from "../src/types/index.js"

const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY!
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

const PROMPT =
  "Write a file called /tmp/test.txt with the content 'Hello World'. Use the write/file tool only—do not run any shell commands."

function normalize(e: Event): string {
  if (e.type === "session") return `session:${e.id ? "id" : ""}`
  if (e.type === "token") return "token"
  if (e.type === "tool_start") {
    const input = (e as { input?: unknown }).input
    const hasPath = input && typeof input === "object" && ("file_path" in input || "path" in input)
    return `tool_start:${(e as { name: string }).name}:${hasPath ? "path" : "no-path"}`
  }
  if (e.type === "tool_end") return "tool_end"
  if (e.type === "end") return "end"
  return (e as { type: string }).type
}

async function collectEvents(providerType: "claude" | "codex"): Promise<Event[]> {
  const envKey = providerType === "claude" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"
  const apiKey = providerType === "claude" ? ANTHROPIC_API_KEY : OPENAI_API_KEY
  const sandbox = createSandbox({ apiKey: DAYTONA_API_KEY, env: { [envKey]: apiKey } })
  await sandbox.create()
  try {
    if (providerType === "codex") {
      await sandbox.executeCommand("npm install -g @openai/codex", 120)
      await sandbox.executeCommand(`echo "${apiKey}" | codex login --with-api-key 2>&1`, 30)
    }
    const provider = createProvider(providerType, { sandbox })
    const events: Event[] = []
    for await (const e of provider.run({ prompt: PROMPT, autoInstall: providerType !== "codex" })) {
      events.push(e)
    }
    return events
  } finally {
    await sandbox.destroy()
  }
}

async function main() {
  console.log("Running Claude...")
  const claudeEvents = await collectEvents("claude")
  console.log("Running Codex...")
  const codexEvents = await collectEvents("codex")

  const a = claudeEvents.map(normalize)
  const b = codexEvents.map(normalize)
  // Compare structure: ignore tokens (order and count can differ)
  const aStruct = a.filter((x) => x !== "token")
  const bStruct = b.filter((x) => x !== "token")

  const same = aStruct.length === bStruct.length && aStruct.every((v, i) => v === bStruct[i])
  if (same) {
    console.log("OK: Claude and Codex produce the same normalized output.")
    console.log("Structure:", aStruct.join(" → "))
    process.exit(0)
  }

  console.error("DIFF: Claude vs Codex normalized event sequence (structure, tokens omitted)")
  console.error("Claude:", aStruct.join(" → "))
  console.error("Codex:", bStruct.join(" → "))
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
