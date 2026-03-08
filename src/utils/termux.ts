/**
 * Termux integration utilities.
 *
 * Uses expo-intent-launcher to send RUN_COMMAND intents to Termux,
 * which is the officially supported way for external apps to execute
 * commands inside Termux.
 */
import * as IntentLauncher from 'expo-intent-launcher';

/** Termux RUN_COMMAND intent constants */
const TERMUX_PACKAGE = 'com.termux';
const RUN_COMMAND_SERVICE = `${TERMUX_PACKAGE}/.app.RunCommandService`;
const RUN_COMMAND_ACTION = `${TERMUX_PACKAGE}.RUN_COMMAND`;

/**
 * Send a RUN_COMMAND intent to Termux.
 *
 * @param command  - The shell command to execute
 * @param args     - Optional array of arguments
 * @param background - Run in background (default true)
 */
export async function runTermuxCommand(
  command: string,
  args: string[] = [],
  background = true,
): Promise<void> {
  const extras: Record<string, unknown> = {
    'com.termux.RUN_COMMAND_PATH': '/data/data/com.termux/files/usr/bin/bash',
    'com.termux.RUN_COMMAND_ARGUMENTS': ['-c', command],
    'com.termux.RUN_COMMAND_BACKGROUND': background,
  };

  await IntentLauncher.startActivityAsync(
    IntentLauncher.ActivityAction.VIEW,
    {
      packageName: TERMUX_PACKAGE,
      className: RUN_COMMAND_SERVICE,
      extra: extras,
    },
  );
}

/**
 * Execute a command inside proot-distro Ubuntu.
 *
 * @param command   - The command to run inside Ubuntu
 * @param bindMount - Optional bind mount in "host:guest" format
 */
export async function runInUbuntu(
  command: string,
  bindMount?: string,
): Promise<void> {
  const bindArg = bindMount ? `--bind ${bindMount}` : '';
  const wrapped = `proot-distro login ubuntu ${bindArg} -- bash -c '${command.replace(/'/g, "'\\''")}'`;
  await runTermuxCommand(wrapped);
}

/**
 * Write a script file into Termux home and execute it.
 *
 * @param scriptContent - Full shell script content
 * @param scriptName    - Filename (placed in Termux home)
 */
export async function writeAndRunScript(
  scriptContent: string,
  scriptName: string,
): Promise<void> {
  // Escape the script for echo
  const escaped = scriptContent.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
  const writeCmd = `echo "${escaped}" > ~/${scriptName} && chmod +x ~/${scriptName} && ~/${scriptName}`;
  await runTermuxCommand(writeCmd);
}

/**
 * Check if Termux is installed by attempting to resolve its package.
 * In a real device scenario, we'd use Linking.canOpenURL or a package check.
 * This is a best-effort heuristic.
 */
export async function isTermuxInstalled(): Promise<boolean> {
  try {
    // Attempt to start Termux — if it's not installed this will throw
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.MAIN,
      { packageName: TERMUX_PACKAGE },
    );
    return true;
  } catch {
    return false;
  }
}

export { TERMUX_PACKAGE, RUN_COMMAND_SERVICE, RUN_COMMAND_ACTION };
