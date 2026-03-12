#!/usr/bin/env npx tsx
/**
 * Test Codex provider
 */
import { createSandbox, createProvider } from "../src/index.js"

const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!DAYTONA_API_KEY || !OPENAI_API_KEY) {
  console.error("Required environment variables: DAYTONA_API_KEY, OPENAI_API_KEY")
  process.exit(1)
}

async function main() {
  console.log("============================================================")
  console.log("  Codex Provider Test")
  console.log("============================================================")
  console.log()

  console.log("Creating sandbox...")
  const sandbox = createSandbox({
    apiKey: DAYTONA_API_KEY,
    env: {
      OPENAI_API_KEY: OPENAI_API_KEY,
    },
  })

  try {
    await sandbox.create()
    console.log("Sandbox created!")

    // Install codex
    console.log("\nInstalling Codex CLI...")
    await sandbox.executeCommand("npm install -g @openai/codex", 120)
    console.log("Installed!")

    // Login to codex
    console.log("\nLogging in to Codex...")
    const loginResult = await sandbox.executeCommand(
      `echo "${OPENAI_API_KEY}" | codex login --with-api-key 2>&1`,
      30
    )
    console.log("Login result:", loginResult.output.trim())

    // Test with provider
    console.log("\n--- Testing Codex via SDK ---")
    console.log("Prompt: \"Say hello briefly\"")
    console.log()

    const provider = createProvider("codex", { sandbox })

    console.log("Response (streaming):")
    const startTime = Date.now()

    for await (const event of provider.run({
      prompt: "Say hello briefly",
      autoInstall: false, // Already installed
    })) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)

      if (event.type === "session") {
        console.log(`  [${elapsed}s] Session: ${event.id.slice(0, 8)}...`)
      } else if (event.type === "token") {
        process.stdout.write(event.text)
      } else if (event.type === "tool_start") {
        console.log(`  [${elapsed}s] Tool: ${event.name}`)
      } else if (event.type === "end") {
        console.log(`\n  [${elapsed}s] Done`)
      }
    }

    console.log("\n✓ Codex test completed!")

  } catch (error) {
    console.error("Error:", error)
    throw error
  } finally {
    console.log("\nDestroying sandbox...")
    await sandbox.destroy()
    console.log("Done!")
  }
}

main().catch((error) => {
  console.error("Test failed:", error)
  process.exit(1)
})
