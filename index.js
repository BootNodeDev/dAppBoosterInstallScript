#!/usr/bin/env node

const { execSync } = require("child_process");
// const fs = require("fs");
const path = require("path");
// const readline = require("readline");

const repoUrl = "https://github.com/bootnodedev/dappbooster.git";
const projectName = process.argv[2];

// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout,
// });

try {
  /^[a-zA-Z0-9-_]+/.test(projectName);
  cloneRepo(projectName);
  return;
} catch (error) {
  console.error("Invalid directory name. Please enter a valid project name.");
  process.exit(1);
}

// request project name to continue
// rl.question("Enter the project name: ", (projectName) => {
//   rl.close();
//   cloneRepo(projectName);
// });

function cloneRepo(projectName) {
  // Sanitize the project name to create a valid directory name
  const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, "-");
  const projectDir = path.join(process.cwd(), sanitizedProjectName);

  try {
    console.log(`cloning DappBooster...`);

    // Clone the repository with minimum history
    execSync(
      `git clone --depth 1 --no-checkout "${repoUrl}" "${projectDir}" > /dev/null 2>&1`,
      {
        stdio: "inherit",
      }
    );

    // Change to the project directory
    process.chdir(projectDir);

    // Fetch all tags
    execSync("git fetch --tags > /dev/null 2>&1", { stdio: "inherit" });

    // Get the latest tag
    const latestTag = execSync(
      "git describe --tags $(git rev-list --tags --max-count=1) 2>/dev/null"
    )
      .toString()
      .trim();

    // Checkout the latest tag
    execSync(`git checkout "${latestTag}" > /dev/null 2>&1`, {
      stdio: "inherit",
    });

    process.chdir(projectDir);

    execSync("rm -rf .git", { stdio: "inherit" });

    execSync("git init > /dev/null 2>&1", { stdio: "inherit" });

    // Print the checked out tag
    console.log(`DappBooster repository cloned in ${projectDir}`);
  } catch (error) {
    console.error("An error occurred:", error.message);
    process.exit(1);
  }
}
