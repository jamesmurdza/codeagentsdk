#!/usr/bin/env npx tsx
/**
 * Debug sandbox streaming
 */
import { createSandbox } from "../src/index.js"

const DAYTONA_API_KEY = "REDACTED_DAYTONA_KEY"

async function main() {
  console.log("Creating sandbox...")
  const sandbox = createSandbox({
    apiKey: DAYTONA_API_KEY,
  })

  try {
    await sandbox.create()
    console.log("Sandbox created!")

    // Test 1: Check if Claude CLI is available
    console.log("\n--- Test 1: Check Claude CLI ---")
    const whichClaude = await sandbox.executeCommand("which claude || echo 'not found'")
    console.log("which claude:", whichClaude.output.trim())

    // Test 2: If not installed, install it
    if (whichClaude.output.includes("not found")) {
      console.log("\n--- Test 2: Installing Claude CLI ---")
      console.log("Running: npm install -g @anthropic-ai/claude-code")
      const installResult = await sandbox.executeCommand("npm install -g @anthropic-ai/claude-code")
      console.log("Install exit code:", installResult.exitCode)
      console.log("Install output (last 500 chars):", installResult.output.slice(-500))
      
      const whichClaude2 = await sandbox.executeCommand("which claude")
      console.log("which claude after install:", whichClaude2.output.trim())
    }

    // Test 3: Run claude --version
    console.log("\n--- Test 3: Claude version ---")
    const version = await sandbox.executeCommand("claude --version")
    console.log("Version exit code:", version.exitCode)
    console.log("Version output:", version.output.trim())

    // Test 4: Test a simple claude command (non-streaming) with API key
    console.log("\n--- Test 4: Simple Claude command ---")
    const ANTHROPIC_API_KEY = "REDACTED_ANTHROPIC_KEY"
    
    // Set the API key
    await sandbox.executeCommand(`export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"`)
    
    // Run claude with a simple prompt (non-interactive mode)
    console.log("Running claude with prompt...")
    const claudeResult = await sandbox.executeCommand(
      `ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" claude -p "Say hello" --output-format stream-json 2>&1 | head -50`
    )
    console.log("Claude exit code:", claudeResult.exitCode)
    console.log("Claude output:", claudeResult.output)

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
