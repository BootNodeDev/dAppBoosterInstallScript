# dAppBooster starter

A script to clone dAppBooster and cleanup the history to freshly start your new project.

Clones the latest tag from https://github.com/BootNodeDev/dAppBooster (so you might not see the last changes in `main`).

## Usage

```shell
$ pnpm dlx dappbooster <projectName>
```

## Development

Move into the script's folder and then

```shell
# Clone the repo
git clone git@github.com:BootNodeDev/dAppBooster-starter.git

# Install dependencies
pnpm i

# Move into the script's folder
cd dAppBooster-starter
```

The common loop for testing the script looks something like

```shell
# Test the script, creates a folder called test
$ node index.js test

# Remove the test directory (ignored in .gitignore)
$ rm -rf test
```