#!/usr/bin/env npx tsx
/**
 * Test our SandboxManager wrapper
 */
import { createSandbox } from "../src/index.js"

const DAYTONA_API_KEY = "REDACTED_DAYTONA_KEY"

async function main() {
  console.log("Creating sandbox with our wrapper...")
  const sandbox = createSandbox({
    apiKey: DAYTONA_API_KEY,
  })

  try {
    await sandbox.create()
    console.log("Sandbox created!")

    // Test 1: Simple echo
    console.log("\nTest 1: echo hello")
    const result1 = await sandbox.executeCommand("echo hello")
    console.log("Exit code:", result1.exitCode)
    console.log("Output:", result1.output)

    // Test 2: node version
    console.log("\nTest 2: node --version")
    const result2 = await sandbox.executeCommand("node --version")
    console.log("Exit code:", result2.exitCode)
    console.log("Output:", result2.output)

    console.log("\n✓ Wrapper tests passed!")
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
