# dotenv-contract-cli

A small, dependency-free CLI that validates a runtime `.env` file against a contract file (usually `.env.example`).

This catches missing keys, empty required values, and optionally extra undocumented keys before deploys.

## Why it is useful

- Prevents runtime failures caused by missing environment variables.
- Enforces a single source of truth for configuration keys.
- Works in CI with predictable exit codes and optional JSON output.

## Install

### Run without install

```bash
npx dotenv-contract-cli --help
```

### Install globally

```bash
npm install -g dotenv-contract-cli
```

## Usage

From a project containing `.env` and `.env.example`:

```bash
dotenv-contract
```

Custom files:

```bash
dotenv-contract --schema .env.template --env .env.production
```

Fail on extra keys not present in schema:

```bash
dotenv-contract --strict
```

Allow specific keys to be intentionally empty:

```bash
dotenv-contract --allow-empty SENTRY_DSN,OPTIONAL_NOTE
```

Machine-readable output:

```bash
dotenv-contract --format json
```

## Exit codes

- `0`: contract passed
- `1`: contract failed (missing/empty/unexpected in strict mode)
- `2`: usage, parsing, or file-read error

## Development

```bash
npm install
npm run lint
npm test
```

## Example CI step

```yaml
- name: Validate environment contract
  run: npx dotenv-contract-cli --schema .env.example --env .env --strict
```

## License

MIT