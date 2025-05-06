# dAppBooster starter

A script to clone dAppBooster and cleanup the history to freshly start your new project

## Usage

```shell
$ pnpm dlx dappbooster <projectName>
```

## Development

Move into the script's folder and then

```shell
# First remove the test directory
$ rm -rf test

# Test the script
$ node index.js test
```

This will create a folder called `test`, which git should ignore by usage of `.gitignore`
