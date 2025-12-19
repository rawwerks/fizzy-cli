/**
 * Authentication commands for fizzy-cli
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { authenticateWithMagicLink } from '../lib/auth/magic-link.js';
import {
  loadTokens,
  deleteTokens,
  listAccounts,
  getDefaultAccount,
  setDefaultAccount,
  removeAccount,
  isAuthenticated,
  type StoredAccount,
} from '../lib/auth/token-storage.js';

/**
 * Prompt user for magic link code
 * Uses Bun's built-in prompt functionality
 */
async function promptForCode(): Promise<string> {
  // Using simple console input for Bun
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(chalk.cyan('\nEnter the 6-character code from your email: '), (answer) => {
      rl.close();
      resolve(answer.trim().toUpperCase());
    });
  });
}

/**
 * Login command - Magic link authentication
 */
const loginCommand = new Command('login')
  .description('Authenticate with Fizzy using magic link (passwordless)')
  .option('--json', 'Output in JSON format')
  .argument('[email]', 'Email address for authentication')
  .action(async (email: string | undefined, options: { json?: boolean }) => {
    const spinner = options.json ? null : ora('Starting authentication...').start();

    try {
      // Get email from argument or prompt
      let userEmail = email;
      if (!userEmail) {
        if (spinner) spinner.stop();

        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        userEmail = await new Promise((resolve) => {
          rl.question(chalk.cyan('Enter your email address: '), (answer) => {
            rl.close();
            resolve(answer.trim());
          });
        });

        if (spinner) spinner.start('Requesting magic link...');
      }

      if (!userEmail) {
        throw new Error('Email address is required');
      }

      if (spinner) spinner.text = 'Sending magic link email...';

      // Start magic link flow
      const accounts = await authenticateWithMagicLink(
        userEmail,
        async () => {
          if (spinner) spinner.stop();
          console.log(chalk.green('\nMagic link email sent!'));
          console.log(chalk.gray('Check your inbox for a 6-character code.'));

          const code = await promptForCode();

          if (spinner) {
            spinner.start('Verifying code...');
          }

          return code;
        }
      );

      if (spinner) spinner.succeed('Authentication successful!');

      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          accounts: accounts.map(acc => ({
            slug: acc.account_slug,
            name: acc.account_name,
            user: acc.user.name,
            email: acc.user.email_address,
          })),
        }, null, 2));
      } else {
        console.log(chalk.green(`\nWelcome, ${accounts[0].user.name}!`));
        console.log(chalk.gray(`Email: ${accounts[0].user.email_address}`));
        console.log(chalk.gray(`\nAuthenticated accounts:`));
        for (const account of accounts) {
          const isDefault = account === accounts[0];
          const marker = isDefault ? chalk.green('* ') : '  ';
          console.log(`${marker}${account.account_name} (${account.account_slug})`);
        }
      }
    } catch (error) {
      if (spinner) spinner.fail('Authentication failed');
      console.error(chalk.red(`\n${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

/**
 * Logout command - Remove credentials
 */
const logoutCommand = new Command('logout')
  .description('Remove stored credentials')
  .option('--json', 'Output in JSON format')
  .option('--account <slug>', 'Remove specific account by slug (otherwise removes all)')
  .action(async (options: { json?: boolean; account?: string }) => {
    try {
      const authenticated = await isAuthenticated();

      if (!authenticated) {
        if (options.json) {
          console.log(JSON.stringify({ success: true, message: 'Not logged in' }));
        } else {
          console.log(chalk.yellow('Not logged in.'));
        }
        return;
      }

      if (options.account) {
        // Remove specific account
        const accounts = await listAccounts();
        const account = accounts.find(a => a.account_slug === options.account);

        if (!account) {
          if (options.json) {
            console.log(JSON.stringify({ success: false, error: 'Account not found' }));
          } else {
            console.error(chalk.red(`Account "${options.account}" not found.`));
          }
          process.exit(1);
        }

        await removeAccount(options.account);

        if (options.json) {
          console.log(JSON.stringify({
            success: true,
            message: `Removed account: ${options.account}`
          }));
        } else {
          console.log(chalk.green(`Removed account: ${account.account_name} (${options.account})`));
        }
      } else {
        // Remove all accounts
        await deleteTokens();

        if (options.json) {
          console.log(JSON.stringify({ success: true, message: 'Logged out' }));
        } else {
          console.log(chalk.green('Successfully logged out.'));
        }
      }
    } catch (error) {
      console.error(chalk.red(`Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

/**
 * Status command - Show authentication status
 */
const statusCommand = new Command('status')
  .description('Show current authentication status and accounts')
  .option('--json', 'Output in JSON format')
  .action(async (options: { json?: boolean }) => {
    try {
      const authenticated = await isAuthenticated();

      if (!authenticated) {
        if (options.json) {
          console.log(JSON.stringify({ authenticated: false }));
        } else {
          console.log(chalk.yellow('Not authenticated. Run `fizzy auth login` to authenticate.'));
        }
        return;
      }

      const accounts = await listAccounts();
      const defaultAccount = await getDefaultAccount();

      if (options.json) {
        console.log(JSON.stringify({
          authenticated: true,
          accounts: accounts.map(acc => ({
            slug: acc.account_slug,
            name: acc.account_name,
            user: {
              name: acc.user.name,
              email: acc.user.email_address,
              role: acc.user.role,
            },
            isDefault: acc.account_slug === defaultAccount?.account_slug,
          })),
          defaultAccount: defaultAccount?.account_slug || null,
        }, null, 2));
      } else {
        console.log(chalk.green('Authenticated'));

        if (defaultAccount) {
          console.log(chalk.gray(`\nUser: ${defaultAccount.user.name} (${defaultAccount.user.email_address})`));
          console.log(chalk.gray(`Default account: ${defaultAccount.account_name} (${defaultAccount.account_slug})`));
        }

        console.log(chalk.gray(`\nAccounts (${accounts.length}):`));
        for (const account of accounts) {
          const isDefault = account.account_slug === defaultAccount?.account_slug;
          const marker = isDefault ? chalk.green('* ') : '  ';
          console.log(`${marker}${account.account_name} (${account.account_slug})`);
          console.log(chalk.gray(`    User: ${account.user.name} (${account.user.role})`));
        }
      }
    } catch (error) {
      console.error(chalk.red(`Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

/**
 * Accounts command - List all accounts
 */
const accountsCommand = new Command('accounts')
  .description('List all authenticated accounts')
  .option('--json', 'Output in JSON format')
  .action(async (options: { json?: boolean }) => {
    try {
      const authenticated = await isAuthenticated();

      if (!authenticated) {
        if (options.json) {
          console.log(JSON.stringify({ error: 'Not authenticated' }));
        } else {
          console.log(chalk.yellow('Not authenticated. Run `fizzy auth login` to authenticate.'));
        }
        process.exit(1);
      }

      const accounts = await listAccounts();
      const defaultAccount = await getDefaultAccount();

      if (options.json) {
        console.log(JSON.stringify({
          accounts: accounts.map(acc => ({
            slug: acc.account_slug,
            name: acc.account_name,
            id: acc.account_id,
            user: {
              name: acc.user.name,
              email: acc.user.email_address,
              role: acc.user.role,
            },
            isDefault: acc.account_slug === defaultAccount?.account_slug,
          })),
          defaultAccount: defaultAccount?.account_slug || null,
        }, null, 2));
      } else {
        console.log(chalk.bold('Available Accounts:'));
        console.log('');
        for (const account of accounts) {
          const isDefault = account.account_slug === defaultAccount?.account_slug;
          const marker = isDefault ? chalk.green('* ') : '  ';
          console.log(`${marker}${account.account_name}`);
          console.log(chalk.gray(`    Slug: ${account.account_slug}`));
          console.log(chalk.gray(`    User: ${account.user.name} (${account.user.role})`));
        }
        console.log('');
        console.log(chalk.gray(`* = default account`));
      }
    } catch (error) {
      console.error(chalk.red(`Failed to list accounts: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

/**
 * Switch command - Switch default account
 */
const switchCommand = new Command('switch')
  .description('Switch the default account')
  .option('--json', 'Output in JSON format')
  .argument('<slug>', 'Account slug to switch to')
  .action(async (slug: string, options: { json?: boolean }) => {
    try {
      const authenticated = await isAuthenticated();

      if (!authenticated) {
        if (options.json) {
          console.log(JSON.stringify({ error: 'Not authenticated' }));
        } else {
          console.log(chalk.yellow('Not authenticated. Run `fizzy auth login` to authenticate.'));
        }
        process.exit(1);
      }

      const accounts = await listAccounts();
      const targetAccount = accounts.find(a => a.account_slug === slug);

      if (!targetAccount) {
        if (options.json) {
          console.log(JSON.stringify({
            success: false,
            error: `Account "${slug}" not found`
          }));
        } else {
          console.error(chalk.red(`Account "${slug}" not found.`));
          console.log(chalk.gray('\nAvailable accounts:'));
          for (const account of accounts) {
            console.log(chalk.gray(`  - ${account.account_slug} (${account.account_name})`));
          }
        }
        process.exit(1);
      }

      await setDefaultAccount(slug);

      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          account: {
            slug: targetAccount.account_slug,
            name: targetAccount.account_name,
          },
        }));
      } else {
        console.log(chalk.green(`Switched to account: ${targetAccount.account_name} (${slug})`));
      }
    } catch (error) {
      console.error(chalk.red(`Failed to switch account: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

/**
 * Auth command group
 */
export const authCommand = new Command('auth')
  .description('Authentication commands')
  .addCommand(loginCommand)
  .addCommand(logoutCommand)
  .addCommand(statusCommand)
  .addCommand(accountsCommand)
  .addCommand(switchCommand);
