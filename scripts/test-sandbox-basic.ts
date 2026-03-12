#!/usr/bin/env npx tsx
/**
 * Basic sandbox test - minimal test to verify sandbox works
 */
import { Daytona } from "@daytonaio/sdk"

const DAYTONA_API_KEY = "REDACTED_DAYTONA_KEY"

async function main() {
  console.log("Creating Daytona client...")
  const daytona = new Daytona({
    apiKey: DAYTONA_API_KEY,
  })

  console.log("Creating sandbox...")
  const sandbox = await daytona.create({
    language: "typescript",
  })
  console.log("Sandbox created!")

  try {
    // Test 1: Simple echo
    console.log("\nTest 1: echo hello")
    const result1 = await sandbox.process.executeCommand("echo hello")
    console.log("Exit code:", result1.exitCode)
    console.log("Result:", result1.result)

    // Test 2: node version
    console.log("\nTest 2: node --version")
    const result2 = await sandbox.process.executeCommand("node --version")
    console.log("Exit code:", result2.exitCode)
    console.log("Result:", result2.result)

    console.log("\n✓ Basic tests passed!")
  } finally {
    console.log("\nDeleting sandbox...")
    await sandbox.delete()
    console.log("Done!")
  }
}

main().catch((error) => {
  console.error("Test failed:", error)
  process.exit(1)
})
