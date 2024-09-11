#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const repoUrl = "https://github.com/bootnodedev/dappbooster.git";
const projectName = process.argv[2];

if (!projectName || !/^[a-zA-Z0-9-_]+$/.test(projectName)) {
  console.error("Invalid directory name. Please enter a valid project name.");
  process.exit(1);
}

cloneRepo(projectName);

function execQuiet(command) {
  const options = {
    stdio: "pipe",
    shell: true,
  };

  if (os.platform() === "win32") {
    command = `${command} > nul 2>&1`;
  } else {
    command = `${command} > /dev/null 2>&1`;
  }

  return execSync(command, options);
}

function cloneRepo(projectName) {
  const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, "-");
  const projectDir = path.join(process.cwd(), sanitizedProjectName);

  try {
    console.log(`Cloning DappBooster...`);

    // Clone the repository
    execQuiet(`git clone --depth 1 --no-checkout "${repoUrl}" "${projectDir}"`);

    // Change to the project directory
    process.chdir(projectDir);

    // Fetch all tags
    execQuiet("git fetch --tags");

    // Get the latest tag
    const latestTag = execSync(
      "git describe --tags $(git rev-list --tags --max-count=1)"
    )
      .toString()
      .trim();

    // Checkout the latest tag
    execQuiet(`git checkout "${latestTag}"`);

    // Remove the .git directory
    fs.rmSync(path.join(projectDir, ".git"), { recursive: true, force: true });

    // Initialize a new git repository
    execQuiet("git init");

    console.log(`DappBooster repository cloned in ${projectDir}`);
  } catch (error) {
    console.error("An error occurred:", error.message);
    process.exit(1);
  }
}
