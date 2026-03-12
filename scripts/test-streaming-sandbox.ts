#!/usr/bin/env npx tsx
/**
 * Test streaming output from Claude in Daytona sandbox
 * This tests the full end-to-end flow:
 * 1. Create sandbox
 * 2. Install Claude CLI
 * 3. Run Claude with streaming
 * 4. Parse events
 * 5. Cleanup
 */
import { createSandbox, createProvider } from "../src/index.js"

const DAYTONA_API_KEY = "REDACTED_DAYTONA_KEY"
const ANTHROPIC_API_KEY = "REDACTED_ANTHROPIC_KEY"

async function main() {
  console.log("=== Streaming Test in Daytona Sandbox ===\n")

  console.log("1. Creating sandbox...")
  const sandbox = createSandbox({
    apiKey: DAYTONA_API_KEY,
  })

  try {
    await sandbox.create()
    console.log("   ✓ Sandbox created!\n")

    // Set the API key in sandbox environment
    sandbox.setEnv("ANTHROPIC_API_KEY", ANTHROPIC_API_KEY)
    console.log("2. Set ANTHROPIC_API_KEY in sandbox environment\n")

    // Install Claude CLI (ensureProvider will check and install if needed)
    console.log("3. Ensuring Claude CLI is installed...")
    await sandbox.ensureProvider("claude")
    console.log("   ✓ Claude CLI ready!\n")

    // Create provider with the sandbox
    console.log("4. Creating Claude provider with sandbox...")
    const provider = createProvider("claude", { sandbox })
    console.log("   ✓ Provider created!\n")

    // Test streaming
    console.log("5. Testing streaming with a simple prompt...")
    console.log("   Prompt: \"Say 'Hello from sandbox!' and nothing else.\"\n")

    let tokenCount = 0
    let eventCount = 0
    let fullText = ""

    console.log("   Events received:")

    for await (const event of provider.run({
      prompt: "Say 'Hello from sandbox!' and nothing else.",
    })) {
      eventCount++

      switch (event.type) {
        case "session":
          console.log(`   - session: id=${event.id}`)
          break
        case "token":
          tokenCount++
          fullText += event.text
          // Show tokens as they arrive
          process.stdout.write(event.text)
          break
        case "tool_start":
          console.log(`\n   - tool_start: ${event.name}`)
          break
        case "tool_delta":
          console.log(`   - tool_delta: ${event.delta?.slice(0, 50)}...`)
          break
        case "tool_end":
          console.log("   - tool_end")
          break
        case "end":
          console.log("\n   - end")
          break
      }
    }

    console.log("\n")
    console.log("6. Results:")
    console.log(`   Total events: ${eventCount}`)
    console.log(`   Token events: ${tokenCount}`)
    console.log(`   Full text: "${fullText}"`)

    // Verify we got some output
    if (tokenCount > 0 && fullText.toLowerCase().includes("hello")) {
      console.log("\n✓ Streaming test PASSED!")
    } else {
      console.log("\n✗ Streaming test FAILED - no expected output")
      process.exit(1)
    }
  } catch (error) {
    console.error("\nError:", error)
    throw error
  } finally {
    console.log("\n7. Destroying sandbox...")
    await sandbox.destroy()
    console.log("   ✓ Sandbox destroyed. Done!")
  }
}

main().catch((error) => {
  console.error("Test failed:", error)
  process.exit(1)
})
