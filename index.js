#!/usr/bin/env node

import { execSync } from "child_process";
import { join } from "path";
import { rmSync } from "fs";
import readline from "readline";
import chalk from "chalk";
import os from "os";

const commandSilencer = os.platform() === "win32" ? '> nul 2>&1' : '> /dev/null 2>&1'

const repoUrls = {
  barebones: "https://github.com/BootNodeDev/dAppBooster.git",
  example: "https://github.com/BootNodeDev/dAppBoosterLandingPage.git",
};

const projectName = process.argv[2];

// Check if the project name is valid
if (!projectName || !/^[a-zA-Z0-9-_]+$/.test(projectName)) {
  console.error(`${chalk.red.bold("Invalid directory name. Please enter a valid project name.")}`);
  process.exit(1);
}

// Prompt the user to select the repository type
promptUserForRepoType()
  .then((repoType) => {
    const repoUrl = repoUrls[repoType];
    cloneRepo(projectName, repoUrl);
  })
  .catch((error) => {
    console.error(chalk.red.bold("Error:"), error.message);
    process.exit(1);
  });

/**
 * @description Prompt the user to select the repository type
 * @returns {Promise<string>} The selected repository type
 */
function promptUserForRepoType() {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      `You can choose to start with a ${chalk.green.bold('Barebones')} project or a project with ${chalk.green.bold('Examples')} and demo code (B/e):`,
      (answer) => {
        rl.close();
        const selection = answer.trim().toUpperCase();
        if (selection === "B" || selection === "") {
          resolve("barebones");
        } else if (selection === "E") {
          resolve("example");
        } else {
          reject(new Error("Invalid selection. Please choose B or E."));
        }
      }
    );
  });
}

/**
 * @description Get the latest tag in the repository
 * @param {Object} execOptions The options to pass to the exec
 * @returns {string} The latest tag in the repository
 */
function getLatestTag(execOptions) {
  // Fetch all tags
  execSync(`git fetch --tags ${commandSilencer}`, execOptions);

  // Get all tags, sorted by version
  const tags = execSync("git tag -l --sort=-v:refname")
    .toString()
    .trim()
    .split("\n");

  // Return the first (latest) tag
  return tags[0];
}

/**
 * @description Clone the specified repository
 * @param {string} projectName The name of the project
 * @param {string} repoUrl The URL of the repository
 * @returns {void}
 */
function cloneRepo(projectName, repoUrl) {
  const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, "-");
  const projectDir = join(process.cwd(), sanitizedProjectName);
  const execOptions = {
    stdio: "pipe",
    shell: true,
  };

  try {
    console.log(`\nCloning dAppBooster...`);

    // Clone the repository
    execSync(
      `git clone --depth 1 --no-checkout "${repoUrl}" "${projectDir}"`,
      execOptions
    );

    // Change to the project directory
    process.chdir(projectDir);

    // Get the latest tag
    const latestTag = getLatestTag();

    if (latestTag) {
      console.log(`Checking out latest tag: ${latestTag}`);
      execSync(`git checkout "${latestTag}"`, execOptions);
    } else {
      console.log(`No tags found, checking out ${chalk.bold('main')} branch...`);
      execSync("git checkout main", execOptions);
    }

    // Remove the .git directory
    rmSync(join(projectDir, ".git"), { recursive: true, force: true });

    // Initialize a new git repository
    execSync("git init", execOptions);

    // Success
    console.log(`\ndAppBooster repository cloned in ${chalk.bold(projectDir)}`);
    if (latestTag) {
      console.log(`Latest version: ${chalk.bold(latestTag)}`);
    }

    console.log(`\n---\n`);
    // Some extra instructions for the user
    console.log(`
${chalk.blue.bold("You can now start your project with the following commands:")}

${chalk.gray.italic("# Change to the project directory")}
$ ${chalk.cyan(`cd ${sanitizedProjectName}`)}

${chalk.gray.italic("# Install dependencies")}
$ ${chalk.cyan("pnpm install")}

${chalk.gray.italic("# Copy the example environment file")}
$ ${chalk.cyan("cp .env.example .env.local")}

${chalk.gray.italic("# Start the development server")}
$ ${chalk.cyan("pnpm dev")}

---

Remember to also check out the docs in ${chalk.green.bold("https://docs.dappbooster.dev/")}

`);
  } catch (error) {
    console.error(`${chalk.bold.red("An error occurred:")}`, error.message);
    process.exit(1);
  }
}
