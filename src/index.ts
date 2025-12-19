#!/usr/bin/env bun

/**
 * fizzy-cli - Command-line interface for Fizzy API
 */

import chalk from 'chalk';
import { runCli } from './cli.js';

runCli().catch((error) => {
  if (error instanceof Error) {
    // Show only the message, not stack trace
    console.error(chalk.red(`Error: ${error.message}`));

    // Add helpful guidance for common errors
    if (error.message.includes('Not Found') || error.message.includes('404')) {
      console.error(chalk.gray('\nTip: Check that the ID exists. Use list commands to see available items.'));
    } else if (error.message.includes('Bad Request') || error.message.includes('400')) {
      console.error(chalk.gray('\nTip: Check your parameters. Use --help to see required arguments.'));
    } else if (error.message.includes('Not authenticated')) {
      // Auth errors already have good guidance, no extra tip needed
    } else if (error.message.includes('Unauthorized') || error.message.includes('401')) {
      console.error(chalk.gray('\nTip: Your session may have expired. Run "fizzy auth login" to re-authenticate.'));
    }
  } else {
    console.error('Error:', String(error));
  }
  process.exit(1);
});
