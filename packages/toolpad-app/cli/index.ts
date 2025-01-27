import 'dotenv/config';
import path from 'path';
import yargs from 'yargs';
import chalk from 'chalk';
import { execaNode } from 'execa';
import { runApp } from '../src/server';

export type Command = 'dev' | 'start' | 'build';
export interface RunOptions {
  dir: string;
  port?: number;
  dev?: boolean;
  base: string;
}

async function runCommand(
  cmd: 'dev' | 'start',
  { dir, dev: toolpadDevMode, ...args }: Omit<RunOptions, 'cmd'>,
) {
  const projectDir = path.resolve(process.cwd(), dir);

  const app = await runApp({
    ...args,
    dir: projectDir,
    dev: cmd !== 'start',
    toolpadDevMode,
  });

  process.once('SIGINT', () => {
    app.dispose().finally(() => {
      process.exit(0);
    });
  });
}

async function devCommand(args: RunOptions) {
  // eslint-disable-next-line no-console
  console.log(`${chalk.blue('info')}  - starting Toolpad application in dev mode...`);
  await runCommand('dev', args);
}

interface BuildOptions {
  dir: string;
  base: string;
}

async function buildCommand({ dir, base }: BuildOptions) {
  const projectDir = path.resolve(process.cwd(), dir);
  // eslint-disable-next-line no-console
  console.log(`${chalk.blue('info')}  - building Toolpad application...`);

  const builderPath = path.resolve(__dirname, './appBuilderWorker.js');

  await execaNode(builderPath, [], {
    stdio: 'inherit',
    env: {
      NODE_ENV: 'production',
      FORCE_COLOR: '1',
      TOOLPAD_PROJECT_DIR: projectDir,
      TOOLPAD_BASE: base,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`${chalk.green('success')} - build done.`);
}

async function startCommand(args: RunOptions) {
  // eslint-disable-next-line no-console
  console.log(`${chalk.blue('info')}  - Starting Toolpad application...`);
  await runCommand('start', args);
}

export default async function cli(argv: string[]) {
  const sharedOptions = {
    dir: {
      type: 'string',
      describe: 'Directory of the Toolpad application',
      default: '.',
    },
    base: {
      type: 'string',
      describe: 'Public base path of the Toolpad application',
      default: '/prod',
    },
  } as const;

  const sharedRunOptions = {
    ...sharedOptions,
    port: {
      type: 'number',
      describe: 'Port to run the Toolpad application on',
      demandOption: false,
    },
    dev: {
      type: 'boolean',
      describe: 'Run the Toolpad editor app in development mode',
      demandOption: false,
      default: false,
      hidden: true,
    },
  } as const;

  const parsedArgs = yargs(argv)
    // See https://github.com/yargs/yargs/issues/538
    .scriptName('toolpad')
    .command(
      ['$0 [dir]', 'dev [dir]'],
      'Run Toolpad in development mode',
      {
        ...sharedRunOptions,
      },
      (args) => devCommand(args),
    )
    .command(
      'start [dir]',
      'Run built Toolpad application in production mode',
      {
        ...sharedRunOptions,
      },
      (args) => startCommand(args),
    )
    .command(
      'build [dir]',
      'Build Toolpad app for production',
      {
        ...sharedOptions,
      },
      (args) => buildCommand(args),
    )
    .command('help', 'Show help', {}, async () => {
      // eslint-disable-next-line no-console
      console.log(await parsedArgs.getHelp());
    })
    .help();

  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  parsedArgs.argv;
}
