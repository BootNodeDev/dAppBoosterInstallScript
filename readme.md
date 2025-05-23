# dAppBooster starter

Installs dAppBooster, using the last tag / release.

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