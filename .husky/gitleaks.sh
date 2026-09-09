# Sourced by pre-commit and pre-push: installs the pinned gitleaks through
# scripts/install-gitleaks.sh, then puts it first on PATH so the hooks and CI run one version.
repo_root=$(cd "$(dirname "$0")/.." && pwd)
"$repo_root/scripts/install-gitleaks.sh"
PATH="$repo_root/bin:$PATH"
