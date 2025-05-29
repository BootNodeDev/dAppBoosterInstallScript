# dAppBooster installer

An easy way to install and customize [dAppBooster](https://dappbooster.dev/)

## Requirements

- Node >= 20
- pnpm

## Usage

<img src="./demo.svg" width="600">

```shell
pnpm dlx dappbooster
```

dAppBooster documentation: https://docs.dappbooster.dev/

## Development

Clone the repo

```shell
git clone git@github.com:BootNodeDev/dAppBoosterInstallScript.git
```

Move into the folder you just created and install the dependencies

```shell
cd dAppBoosterInstallScript

pnpm i
```

You can run the script by doing

```shell
node cli.js
```

## Releasing new versions to NPM

New releases are automatically uploaded to NPM using GitHub actions.