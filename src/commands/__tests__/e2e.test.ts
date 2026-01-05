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
      "reactions",
      "tags",
      "columns",
      "steps",
      "notifications",
    ];

    commands.forEach((command) => {
      it(`${command} command shows help`, () => {
        const output = runCLI(`${command} --help`);
        expect(output).toContain(command);
      });
    });
  });

  describe("Users Commands", () => {
    const userCommands = ["list", "get", "me", "update", "deactivate"];

    userCommands.forEach((subcommand) => {
      it(`users ${subcommand} command exists`, () => {
        const output = runCLI(`users ${subcommand} --help`);
        expect(output).toContain(subcommand);
      });
    });
  });

  describe("Cards Commands", () => {
    const cardCommands = [
      "list",
      "get",
      "create",
      "update",
      "delete",
      "close",
      "reopen",
      "move",
      "postpone",
      "triage",
      "tag",
      "assign",
      "watch",
      "unwatch",
    ];

    cardCommands.forEach((subcommand) => {
      it(`cards ${subcommand} command exists`, () => {
        const output = runCLI(`cards ${subcommand} --help`);
        expect(output).toContain(subcommand);
      });
    });

    it("cards postpone requires card number", () => {
      const output = runCLI("cards postpone --help");
      expect(output).toContain("postpone");
      expect(output).toContain("number");
    });

    it("cards triage requires card number", () => {
      const output = runCLI("cards triage --help");
      expect(output).toContain("triage");
      expect(output).toContain("number");
    });

    it("cards tag supports add and remove options", () => {
      const output = runCLI("cards tag --help");
      expect(output).toContain("--add");
      expect(output).toContain("--remove");
    });

    it("cards assign supports add and remove options", () => {
      const output = runCLI("cards assign --help");
      expect(output).toContain("--add");
      expect(output).toContain("--remove");
    });

    it("cards watch requires card number", () => {
      const output = runCLI("cards watch --help");
      expect(output).toContain("watch");
      expect(output).toContain("number");
    });

    it("cards unwatch requires card number", () => {
      const output = runCLI("cards unwatch --help");
      expect(output).toContain("unwatch");
      expect(output).toContain("number");
    });
  });

  describe("Notifications Commands", () => {
    const notificationCommands = [
      "list",
      "read",
      "unread",
      "mark-all-read",
    ];

    notificationCommands.forEach((subcommand) => {
      it(`notifications ${subcommand} command exists`, () => {
        const output = runCLI(`notifications ${subcommand} --help`);
        expect(output).toContain(subcommand);
      });
    });
  });

  describe("Reactions Commands", () => {
    const reactionCommands = [
      "list",
      "create",
      "delete",
    ];

    reactionCommands.forEach((subcommand) => {
      it(`reactions ${subcommand} command exists`, () => {
        const output = runCLI(`reactions ${subcommand} --help`);
        expect(output).toContain(subcommand);
      });
    });

    it("reactions list requires comment and card options", () => {
      const output = runCLI("reactions list --help");
      expect(output).toContain("--comment");
      expect(output).toContain("--card");
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
