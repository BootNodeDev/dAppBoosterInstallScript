#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const repoUrl = "https://github.com/bootnodedev/dappbooster.git";
const projectName = process.argv[2];

if (!projectName || !/^[a-zA-Z0-9-_]+$/.test(projectName)) {
  console.error("Invalid directory name. Please enter a valid project name.");
  process.exit(1);
}

cloneRepo(projectName);

function getLatestTag() {
  // Get all tags, sorted by version
  const tags = execSync("git tag -l --sort=-v:refname")
    .toString()
    .trim()
    .split("\n");

  // Return the first (latest) tag
  return tags[0];
}

function cloneRepo(projectName) {
  const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, "-");
  const projectDir = path.join(process.cwd(), sanitizedProjectName);
  const execOptions = {
    stdio: "pipe",
    shell: true,
  };

  try {
    console.log(`Cloning DappBooster...`);

    // Clone the repository
    execSync(
      `git clone --depth 1 --no-checkout "${repoUrl}" "${projectDir}"`,
      execOptions
    );

    // Change to the project directory
    process.chdir(projectDir);

    // Fetch all tags
    execSync("git fetch --tags", execOptions);

    // Get the latest tag
    const latestTag = getLatestTag();

    if (!latestTag) {
      throw new Error("No tags found in the repository");
    }

    // Checkout the latest tag
    execSync(`git checkout "${latestTag}"`, execOptions);

    // Remove the .git directory
    fs.rmSync(path.join(projectDir, ".git"), { recursive: true, force: true });

    // Initialize a new git repository
    execSync("git init", execOptions);

    console.log(`DappBooster repository cloned in ${projectDir}`);
    console.log(`Latest version: ${latestTag}`);
  } catch (error) {
    console.error("An error occurred:", error.message);
    process.exit(1);
  }
}
