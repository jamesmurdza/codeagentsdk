#!/usr/bin/env npx tsx
/**
 * Test Claude in sandbox
 */
import { createSandbox, createProvider } from "../src/index.js"

const DAYTONA_API_KEY = "REDACTED_DAYTONA_KEY"
const ANTHROPIC_API_KEY = "REDACTED_ANTHROPIC_KEY"

async function main() {
  console.log("Creating sandbox...")
  const sandbox = createSandbox({
    apiKey: DAYTONA_API_KEY,
  })

  try {
    await sandbox.create()
    console.log("Sandbox created!")

    // Install Claude CLI
    console.log("\nInstalling Claude CLI...")
    await sandbox.ensureProvider("claude")
    console.log("Claude CLI installed!")

    // Set API key
    sandbox.setEnv("ANTHROPIC_API_KEY", ANTHROPIC_API_KEY)
    console.log("ANTHROPIC_API_KEY set")

    // Test claude directly first with 60s timeout
    console.log("\nTesting claude command directly (60s timeout)...")
    const result = await sandbox.executeCommand(
      "claude -p --output-format stream-json --verbose 'Say hello'",
      60
    )
    console.log("Exit code:", result.exitCode)
    console.log("Output:", result.output.slice(0, 1000))

    console.log("\n✓ Test completed!")
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
