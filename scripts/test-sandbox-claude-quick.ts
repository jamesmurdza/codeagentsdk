#!/usr/bin/env npx tsx
/**
 * Quick Claude test with timeout
 */
import { createSandbox } from "../src/index.js"

const DAYTONA_API_KEY = "REDACTED_DAYTONA_KEY"
const ANTHROPIC_API_KEY = "REDACTED_ANTHROPIC_KEY"

async function main() {
  console.log("Creating sandbox...")
  const sandbox = createSandbox({
    apiKey: DAYTONA_API_KEY,
    env: {
      ANTHROPIC_API_KEY: ANTHROPIC_API_KEY,
    },
  })

  try {
    await sandbox.create()
    console.log("Sandbox created!")

    // Access the underlying sandbox
    const daySandbox = sandbox.sandbox
    if (!daySandbox) {
      throw new Error("No sandbox")
    }

    // Run claude directly with verbose and stream-json
    console.log("\n--- Running Claude with --verbose --output-format stream-json ---")
    const result = await daySandbox.process.executeCommand(
      `claude -p "Say just hello" --output-format stream-json --verbose`,
      undefined, // cwd
      { ANTHROPIC_API_KEY }, // env
      60 // timeout in seconds
    )
    
    console.log("Exit code:", result.exitCode)
    console.log("Output:", result.result)

  } catch (error) {
    console.error("Error:", error)
  } finally {
    console.log("\nDestroying sandbox...")
    await sandbox.destroy()
    console.log("Done!")
  }
}

main().catch(console.error)
