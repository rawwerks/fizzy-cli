#!/usr/bin/env bun
/**
 * Auto-generate COMMANDS.md from CLI structure
 * Reads command definitions from code and generates markdown
 */

import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CommandInfo {
  name: string;
  description: string;
  options: Array<{ flags: string; description: string; defaultValue?: any }>;
  arguments: Array<{ name: string; required: boolean; description?: string }>;
  examples?: string;
  subcommands: CommandInfo[];
}

/**
 * Extract command information from a Commander Command object
 */
function extractCommandInfo(cmd: Command): CommandInfo {
  const info: CommandInfo = {
    name: cmd.name(),
    description: cmd.description(),
    options: [],
    arguments: [],
    subcommands: [],
  };

  // Extract options
  cmd.options.forEach((opt) => {
    info.options.push({
      flags: opt.flags,
      description: opt.description,
      defaultValue: opt.defaultValue,
    });
  });

  // Extract arguments
  cmd.registeredArguments?.forEach((arg) => {
    info.arguments.push({
      name: arg.name(),
      required: arg.required,
      description: arg.description,
    });
  });

  // Extract examples from help text by parsing the command's additionalHelpText
  // The examples are added via .addHelpText('after', '...'), so we need to check for that
  try {
    const helpInfo = cmd.helpInformation();
    const examplesIndex = helpInfo.indexOf('Examples:');
    if (examplesIndex !== -1) {
      // Extract from "Examples:" to the end
      const examplesText = helpInfo.substring(examplesIndex);
      // Remove "Examples:" header and trim
      const examples = examplesText.replace(/^Examples:\s*\n?/, '').trim();
      if (examples) {
        info.examples = examples;
      }
    }
  } catch (error) {
    // Ignore errors in example extraction
  }

  // Extract subcommands
  cmd.commands.forEach((subcmd) => {
    info.subcommands.push(extractCommandInfo(subcmd));
  });

  return info;
}

/**
 * Format command documentation as markdown
 */
function formatCommandMarkdown(cmd: CommandInfo, level: number = 2): string {
  let markdown = '';
  const heading = '#'.repeat(level);

  // Command heading
  markdown += `${heading} ${cmd.name}\n\n`;

  // Description
  if (cmd.description) {
    markdown += `${cmd.description}\n\n`;
  }

  // Usage
  if (cmd.arguments.length > 0 || cmd.options.length > 0) {
    markdown += '**Usage:**\n\n';
    let usage = `fizzy ${cmd.name}`;

    // Add arguments
    cmd.arguments.forEach((arg) => {
      if (arg.required) {
        usage += ` <${arg.name}>`;
      } else {
        usage += ` [${arg.name}]`;
      }
    });

    // Add options placeholder
    if (cmd.options.length > 0) {
      usage += ' [options]';
    }

    markdown += `\`\`\`bash\n${usage}\n\`\`\`\n\n`;
  }

  // Arguments
  if (cmd.arguments.length > 0) {
    markdown += '**Arguments:**\n\n';
    cmd.arguments.forEach((arg) => {
      const required = arg.required ? '(required)' : '(optional)';
      markdown += `- \`${arg.name}\` ${required}`;
      if (arg.description) {
        markdown += ` - ${arg.description}`;
      }
      markdown += '\n';
    });
    markdown += '\n';
  }

  // Options
  if (cmd.options.length > 0) {
    markdown += '**Options:**\n\n';
    cmd.options.forEach((opt) => {
      markdown += `- \`${opt.flags}\``;
      if (opt.description) {
        markdown += ` - ${opt.description}`;
      }
      if (opt.defaultValue !== undefined) {
        markdown += ` (default: ${JSON.stringify(opt.defaultValue)})`;
      }
      markdown += '\n';
    });
    markdown += '\n';
  }

  // Examples
  if (cmd.examples) {
    markdown += '**Examples:**\n\n';
    markdown += '```bash\n';
    markdown += cmd.examples;
    markdown += '\n```\n\n';
  }

  // Subcommands
  if (cmd.subcommands.length > 0) {
    markdown += `**Subcommands:**\n\n`;
    cmd.subcommands.forEach((subcmd) => {
      markdown += `- \`${subcmd.name}\` - ${subcmd.description}\n`;
    });
    markdown += '\n';

    // Detailed subcommand documentation
    cmd.subcommands.forEach((subcmd) => {
      markdown += formatCommandMarkdown(subcmd, level + 1);
    });
  }

  return markdown;
}

/**
 * Generate complete documentation
 */
async function generateDocs(): Promise<void> {
  try {
    // Import commands from source (not dist)
    const { authCommand } = await import('../src/commands/auth.js');
    const { createBoardsCommand } = await import('../src/commands/boards.js');
    const { createCardsCommand } = await import('../src/commands/cards.js');
    const { columnsCommand } = await import('../src/commands/columns.js');
    const { commentsCommand } = await import('../src/commands/comments.js');
    const { reactionsCommand } = await import('../src/commands/reactions.js');
    const { stepsCommand } = await import('../src/commands/steps.js');
    const { createTagsCommand } = await import('../src/commands/tags.js');
    const { createUsersCommand } = await import('../src/commands/users.js');
    const { createNotificationsCommand } = await import('../src/commands/notifications.js');

    // Create command instances
    const boardsCommand = createBoardsCommand();
    const cardsCommand = createCardsCommand();
    const tagsCommand = createTagsCommand();
    const usersCommand = createUsersCommand();
    const notificationsCommand = createNotificationsCommand();

    // Create program
    const program = new Command();
    program
      .name('fizzy')
      .description('Command-line interface for Fizzy API')
      .version('1.0.0');

    // Register commands
    program.addCommand(authCommand);
    program.addCommand(boardsCommand);
    program.addCommand(cardsCommand);
    program.addCommand(columnsCommand);
    program.addCommand(commentsCommand);
    program.addCommand(reactionsCommand);
    program.addCommand(stepsCommand);
    program.addCommand(tagsCommand);
    program.addCommand(usersCommand);
    program.addCommand(notificationsCommand);

    // Generate markdown
    let markdown = '# Command Reference\n\n';
    markdown += 'Auto-generated from CLI source code.\n\n';
    markdown += '> This documentation is automatically generated from the CLI command definitions.\n\n';

    markdown += '## Table of Contents\n\n';
    program.commands.forEach((cmd) => {
      markdown += `- [${cmd.name()}](#${cmd.name()})\n`;
    });
    markdown += '\n---\n\n';

    // Generate documentation for each command
    program.commands.forEach((cmd) => {
      const cmdInfo = extractCommandInfo(cmd);
      markdown += formatCommandMarkdown(cmdInfo);
      markdown += '---\n\n';
    });

    // Write to file
    const docsPath = join(__dirname, '../docs/COMMANDS.md');
    writeFileSync(docsPath, markdown, 'utf-8');

    console.log('✅ Generated docs/COMMANDS.md');
    console.log(`   Commands documented: ${program.commands.length}`);

    // Count total subcommands
    let totalSubcommands = 0;
    program.commands.forEach((cmd) => {
      totalSubcommands += cmd.commands.length;
    });
    console.log(`   Subcommands documented: ${totalSubcommands}`);

  } catch (error) {
    console.error('❌ Failed to generate documentation:');
    console.error(error);
    process.exit(1);
  }
}

// Run documentation generation
generateDocs();
