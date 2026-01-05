#!/usr/bin/env bun
/**
 * Generate a report of documentation completeness
 * Analyzes commands and checks for examples and JSDoc
 */

import { Command } from 'commander';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DocStats {
  totalCommands: number;
  withExamples: number;
  withJSDoc: number;
  missingExamples: string[];
  missingJSDoc: string[];
}

/**
 * Check if a command file has examples
 */
function hasExamples(filePath: string): boolean {
  const content = readFileSync(filePath, 'utf-8');
  return content.includes('.addHelpText') && content.includes('Examples:');
}

/**
 * Check if a command file has JSDoc comments
 */
function hasJSDoc(filePath: string): boolean {
  const content = readFileSync(filePath, 'utf-8');
  // Look for JSDoc comments with @example tags
  return content.includes('/**') && content.includes('* @example');
}

/**
 * Count functions in a file
 */
function countFunctions(filePath: string): number {
  const content = readFileSync(filePath, 'utf-8');
  // Match function declarations and arrow functions
  const functionMatches = content.match(/(?:function\s+\w+|(?:async\s+)?function\s*\(|const\s+\w+\s*=\s*(?:async\s*)?\()/g);
  return functionMatches ? functionMatches.length : 0;
}

/**
 * Analyze documentation completeness
 */
function analyzeDocumentation(): DocStats {
  const stats: DocStats = {
    totalCommands: 0,
    withExamples: 0,
    withJSDoc: 0,
    missingExamples: [],
    missingJSDoc: [],
  };

  const commandsDir = join(__dirname, '../src/commands');
  const files = readdirSync(commandsDir).filter(
    (file) => file.endsWith('.ts') && !file.includes('.test.') && file !== 'index.ts'
  );

  // Filter out test directory
  const commandFiles = files.filter((file) => !file.startsWith('__'));

  stats.totalCommands = commandFiles.length;

  for (const file of commandFiles) {
    const filePath = join(commandsDir, file);
    const fileName = file.replace('.ts', '');

    // Check for examples
    if (hasExamples(filePath)) {
      stats.withExamples++;
    } else {
      stats.missingExamples.push(fileName);
    }

    // Check for JSDoc
    if (hasJSDoc(filePath)) {
      stats.withJSDoc++;
    } else {
      stats.missingJSDoc.push(fileName);
    }
  }

  return stats;
}

/**
 * Format percentage
 */
function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

/**
 * Print colored output
 */
function printColored(text: string, color: 'green' | 'yellow' | 'red' | 'cyan' | 'gray'): void {
  const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
  };
  const reset = '\x1b[0m';
  console.log(colors[color] + text + reset);
}

/**
 * Main report function
 */
function generateReport(): void {
  console.log('');
  printColored('📊 Documentation Completeness Report', 'cyan');
  printColored('=====================================', 'cyan');
  console.log('');

  const stats = analyzeDocumentation();

  // Summary
  printColored('Summary:', 'cyan');
  console.log(`  Total command files: ${stats.totalCommands}`);
  console.log(`  With examples: ${stats.withExamples} (${formatPercent(stats.withExamples, stats.totalCommands)})`);
  console.log(`  With JSDoc: ${stats.withJSDoc} (${formatPercent(stats.withJSDoc, stats.totalCommands)})`);
  console.log('');

  // Progress bars
  const examplesPercent = stats.totalCommands > 0 ? (stats.withExamples / stats.totalCommands) : 0;
  const jsDocPercent = stats.totalCommands > 0 ? (stats.withJSDoc / stats.totalCommands) : 0;

  console.log('  Examples coverage:');
  console.log('  ' + generateProgressBar(examplesPercent));
  console.log('');

  console.log('  JSDoc coverage:');
  console.log('  ' + generateProgressBar(jsDocPercent));
  console.log('');

  // Missing examples
  if (stats.missingExamples.length > 0) {
    printColored('Commands missing examples:', 'yellow');
    stats.missingExamples.forEach((cmd) => {
      console.log(`  - ${cmd}`);
    });
    console.log('');
  } else {
    printColored('✅ All commands have examples!', 'green');
    console.log('');
  }

  // Missing JSDoc
  if (stats.missingJSDoc.length > 0) {
    printColored('Commands missing JSDoc:', 'yellow');
    stats.missingJSDoc.forEach((cmd) => {
      console.log(`  - ${cmd}`);
    });
    console.log('');
  } else {
    printColored('✅ All commands have JSDoc!', 'green');
    console.log('');
  }

  // Overall status
  if (stats.withExamples === stats.totalCommands && stats.withJSDoc === stats.totalCommands) {
    printColored('🎉 Perfect! All documentation is complete!', 'green');
  } else {
    const remaining = (stats.totalCommands - stats.withExamples) + (stats.totalCommands - stats.withJSDoc);
    printColored(`⚠️  ${remaining} documentation items remaining`, 'yellow');
  }
  console.log('');

  // Recommendations
  if (stats.missingExamples.length > 0 || stats.missingJSDoc.length > 0) {
    printColored('Recommendations:', 'cyan');
    if (stats.missingExamples.length > 0) {
      console.log('  1. Add examples to command help text using .addHelpText("after", ...)');
    }
    if (stats.missingJSDoc.length > 0) {
      console.log('  2. Add JSDoc comments with @example tags to command functions');
    }
    console.log('  3. Run "bun run docs" to regenerate documentation');
    console.log('');
  }
}

/**
 * Generate a progress bar
 */
function generateProgressBar(percent: number, width: number = 40): string {
  const filled = Math.round(percent * width);
  const empty = width - filled;

  let color: 'green' | 'yellow' | 'red';
  if (percent >= 0.9) {
    color = 'green';
  } else if (percent >= 0.6) {
    color = 'yellow';
  } else {
    color = 'red';
  }

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percentText = `${Math.round(percent * 100)}%`;

  const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
  };
  const reset = '\x1b[0m';

  return `${colors[color]}${bar}${reset} ${percentText}`;
}

// Run the report
generateReport();
