#!/usr/bin/env npx tsx
/**
 * Test Codex CLI directly
 */
import { createSandbox } from "../src/index.js"

const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!DAYTONA_API_KEY || !OPENAI_API_KEY) {
  console.error("Required environment variables: DAYTONA_API_KEY, OPENAI_API_KEY")
  process.exit(1)
}

async function main() {
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
    console.log("\nInstalling codex...")
    await sandbox.executeCommand("npm install -g @openai/codex", 120)
    console.log("Installed!")

    // Check what env var codex uses
    console.log("\n--- Checking env var ---")
    const envResult = await sandbox.executeCommand("env | grep -i openai")
    console.log("Env:", envResult.output)

    // Try running codex exec with inline env var
    console.log("\n--- Running with explicit OPENAI_API_KEY ---")
    const jsonResult = await sandbox.executeCommand(
      `OPENAI_API_KEY="${OPENAI_API_KEY}" codex exec --skip-git-repo-check --json 'Say hello briefly' 2>&1`, 
      60
    )
    console.log("Exit code:", jsonResult.exitCode)
    console.log("Output:", jsonResult.output)

  } catch (error) {
    console.error("Error:", error)
  } finally {
    console.log("\nDestroying sandbox...")
    await sandbox.destroy()
    console.log("Done!")
  }
}

main().catch(console.error)
