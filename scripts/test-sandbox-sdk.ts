#!/usr/bin/env npx tsx
/**
 * Full SDK integration test with sandbox
 */
import { createSandbox, createProvider } from "../src/index.js"

const DAYTONA_API_KEY = "REDACTED_DAYTONA_KEY"
const ANTHROPIC_API_KEY = "REDACTED_ANTHROPIC_KEY"

async function main() {
  console.log("============================================================")
  console.log("Code Agent SDK - Full Integration Test")
  console.log("============================================================")
  console.log()

  // Create sandbox first
  console.log("1. Creating Daytona sandbox...")
  const sandbox = createSandbox({
    apiKey: DAYTONA_API_KEY,
    env: {
      ANTHROPIC_API_KEY: ANTHROPIC_API_KEY,
    },
  })

  try {
    await sandbox.create()
    console.log("   ✓ Sandbox created")

    // Create Claude provider with sandbox
    console.log("2. Creating Claude provider with sandbox...")
    const provider = createProvider("claude", { sandbox })
    console.log("   ✓ Provider created")

    // Test with collectText for simpler flow
    console.log("3. Testing collectText...")
    console.log("   Prompt: \"Say 'Hello from sandbox!' and nothing else.\"")
    console.log("------------------------------------------------------------")
    
    const text = await provider.collectText({
      prompt: "Say 'Hello from sandbox!' and nothing else.",
    })
    
    console.log("   Response:", text)
    console.log("------------------------------------------------------------")
    
    if (text.toLowerCase().includes("hello")) {
      console.log("   ✓ Test passed!")
    } else {
      console.log("   ✗ Test failed - unexpected response")
    }

  } catch (error) {
    console.error("Error:", error)
    throw error
  } finally {
    console.log()
    console.log("4. Destroying sandbox...")
    await sandbox.destroy()
    console.log("   ✓ Sandbox destroyed")
    console.log()
    console.log("============================================================")
    console.log("Test completed!")
    console.log("============================================================")
  }
}

main().catch((error) => {
  console.error("Test failed:", error)
  process.exit(1)
})
