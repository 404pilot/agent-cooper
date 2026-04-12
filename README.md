# Agent Cooper

Personal automation powered by Azure Functions.

See [architecture](docs/architecture.md) for diagrams.

## Prerequisites

1. [nvm](https://github.com/nvm-sh/nvm) — Node version manager
2. [SOPS](https://github.com/getsops/sops) — encrypted secrets
3. [gitleaks](https://github.com/gitleaks/gitleaks) — pre-commit secret scanning
4. [Terraform](https://www.terraform.io/) — infrastructure as code
5. [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/) — `az login` for authentication

## Setup

```bash
az login                                   # login with personal Azure account
nvm install                                # install and switch to Node version in .nvmrc
npm install                                # install dependencies + enable pre-commit secret scanning
```

## One-time setup

```bash
./scripts/bootstrap.sh                     # create Key Vault, SOPS key, Terraform state storage
sops secrets/secrets.yaml                  # add your Wyze credentials, save to encrypt
./scripts/upload-secrets.sh                # decrypt SOPS and upload to Key Vault
```

## Deploy (repeatable)

```bash
./scripts/deploy.sh                        # build code + terraform apply (infra + zip deploy)
```

## Update secrets

```bash
sops secrets/secrets.yaml                  # edit, auto re-encrypts on save
./scripts/upload-secrets.sh                # upload changed secrets to Key Vault
```

## API playground

```bash
 # generate .env for VS Code REST Client
./api/gen-env.sh secrets/secrets.yaml .env
# then open api/*.http in VS Code
```

## Development

```bash
npm run build                        # compile TypeScript
npm test                             # run all tests (unit + safe integration)
npm test -- tests/unit               # run unit tests only
npm run test:integration             # run integration tests (hits real APIs)
npm run test:pre-deploy              # run pre-deploy tests (side effects like sending email, excluded from regular runs)
npm test -- -t "isOpenTooLong"       # run a specific test by name
npm run lint                         # check code quality
npm run format                       # auto-fix formatting
```

## Teardown

```bash
az group delete --name rg-agent-cooper --yes          # delete project infra
# rg-agent-cooper-shared is kept (Key Vault, SOPS key, Terraform state)
```
