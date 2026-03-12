#!/usr/bin/env npx tsx
/**
 * Test Claude directly using Daytona SDK
 */
import { Daytona } from "@daytonaio/sdk"

const DAYTONA_API_KEY = "REDACTED_DAYTONA_KEY"
const ANTHROPIC_API_KEY = "REDACTED_ANTHROPIC_KEY"

async function main() {
  console.log("Creating Daytona client...")
  const daytona = new Daytona({ apiKey: DAYTONA_API_KEY })

  console.log("Creating sandbox...")
  const sandbox = await daytona.create({ language: "typescript" })
  console.log("Sandbox created!")

  try {
    // Install Claude
    console.log("\nInstalling Claude CLI...")
    const installResult = await sandbox.process.executeCommand(
      "npm install -g @anthropic-ai/claude-code",
      undefined,
      undefined,
      120
    )
    console.log("Install exit code:", installResult.exitCode)

    // Run Claude with timeout
    console.log("\nRunning Claude...")
    const result = await sandbox.process.executeCommand(
      `ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY} claude -p --output-format stream-json --verbose 'Say hi'`,
      undefined,
      undefined,
      30 // 30 second timeout
    )
    console.log("Exit code:", result.exitCode)
    console.log("Result:", result.result)

  } finally {
    console.log("\nDeleting sandbox...")
    await sandbox.delete()
    console.log("Done!")
  }
}

main().catch(console.error)
