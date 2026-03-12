#!/usr/bin/env npx tsx
/**
 * Test to capture SDK events for file write operations from each provider
 */
import { createSandbox, createProvider } from "../src/index.js"

const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY!
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!

const PROMPT_WRITE =
  "Write a file called /tmp/test.txt with the content 'Hello World'. Use the write/file tool only—do not run any shell commands."

const PROMPT_LS_THEN_WRITE = [
  "Do exactly two steps, in order:",
  "1. Run the shell command 'ls -la /tmp' and tell me what it outputs.",
  "2. Then write a file at /tmp/hello.txt with the exact content 'Hello from SDK test' using the write tool.",
  "Confirm both steps when done.",
].join(" ")

async function testProvider(
  name: string,
  providerType: "claude" | "codex" | "opencode" | "gemini",
  apiKey: string,
  envKey: string,
  prompt: string,
  title: string
) {
  console.log("\n" + "=".repeat(70))
  console.log(`  ${name.toUpperCase()} - ${title}`)
  console.log("=".repeat(70))

  const sandbox = createSandbox({
    apiKey: DAYTONA_API_KEY,
    env: { [envKey]: apiKey },
  })

  await sandbox.create()
  console.log("Sandbox created\n")

  try {
    if (providerType === "codex") {
      console.log("Installing Codex CLI...")
      await sandbox.executeCommand("npm install -g @openai/codex", 120)
      await sandbox.executeCommand(`echo "${apiKey}" | codex login --with-api-key 2>&1`, 30)
      console.log("Codex ready\n")
    }

    const provider = createProvider(providerType, { sandbox })

    console.log("Events received:")
    console.log("-".repeat(50))

    for await (const event of provider.run({
      prompt,
      autoInstall: providerType !== "codex",
    })) {
      // Print each event as JSON for clear inspection
      console.log(JSON.stringify(event, null, 2))
    }

    console.log("-".repeat(50))
    console.log(`✓ ${name} done`)
  } finally {
    await sandbox.destroy()
  }
}

async function main() {
  const provider = process.argv[2] || "all"
  const scenario = process.argv[3] || "write"
  const prompt = scenario === "ls-write" ? PROMPT_LS_THEN_WRITE : PROMPT_WRITE
  const title = scenario === "ls-write" ? "LS Then Write" : "Write File"

  if (provider === "claude" || provider === "all") {
    await testProvider("Claude", "claude", ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY", prompt, title)
  }

  if (provider === "codex" || provider === "all") {
    await testProvider("Codex", "codex", OPENAI_API_KEY, "OPENAI_API_KEY", prompt, title)
  }

  if (provider === "opencode" || provider === "all") {
    await testProvider("OpenCode", "opencode", OPENAI_API_KEY, "OPENAI_API_KEY", prompt, title)
  }

  if ((provider === "gemini" || provider === "all") && GEMINI_API_KEY) {
    await testProvider("Gemini", "gemini", GEMINI_API_KEY, "GOOGLE_API_KEY", prompt, title)
  }

  console.log("\n" + "=".repeat(70))
  console.log("  All tests completed!")
  console.log("=".repeat(70))
}

main().catch(console.error)
