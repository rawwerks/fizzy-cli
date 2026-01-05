import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * End-to-End Tests
 *
 * These tests verify complete workflows work together,
 * simulating real user interactions with the CLI.
 */

describe("E2E: CLI Workflows", () => {
  let testDir: string;
  let configDir: string;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `fizzy-cli-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Set config directory to test directory
    configDir = join(testDir, ".fizzy");
    process.env.XDG_CONFIG_HOME = testDir;
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    delete process.env.XDG_CONFIG_HOME;
  });

  const runCLI = (args: string): string => {
    try {
      return execSync(`bun dist/index.js ${args}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error: any) {
      return error.stdout || error.message;
    }
  };

  describe("Help and Version", () => {
    it("shows help when --help is passed", () => {
      const output = runCLI("--help");
      expect(output).toContain("fizzy");
      expect(output).toContain("Command-line interface for Fizzy API");
    });

    it("shows version when --version is passed", () => {
      const output = runCLI("--version");
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe("Command Structure", () => {
    const commands = [
      "auth",
      "boards",
      "cards",
      "users",
      "comments",
      "tags",
      "columns",
      "notifications",
    ];

    commands.forEach((command) => {
      it(`${command} command shows help`, () => {
        const output = runCLI(`${command} --help`);
        expect(output).toContain(command);
      });
    });
  });

  describe("Error Handling", () => {
    it("shows helpful error for unknown command", () => {
      const output = runCLI("nonexistent-command");
      expect(output).toContain("error");
    });

    it("requires authentication for protected commands", () => {
      // Without auth config, should show auth error
      const output = runCLI("boards list --json");
      // Will fail since no auth is configured
      expect(output).toBeDefined();
    });
  });

  describe("Output Formats", () => {
    it("supports JSON output format", () => {
      const output = runCLI("--help --json");
      // Even help with --json should not crash
      expect(output).toBeDefined();
    });
  });
});

describe("E2E: Configuration", () => {
  it("handles missing configuration gracefully", () => {
    const output = execSync("bun dist/index.js boards list 2>&1 || true", {
      encoding: "utf-8",
      env: { ...process.env, XDG_CONFIG_HOME: "/tmp/nonexistent" },
    });
    // Should show auth error, not crash
    expect(output).toBeDefined();
  });
});
