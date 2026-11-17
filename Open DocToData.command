#!/bin/zsh
# Finder opens .command files in Terminal. Always work relative to this file.
cd -- "${0:A:h}" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
printf '\nDocToData — starting your workspace\n\n'
if [[ ! -x .venv/bin/python ]]; then
    if ! command -v python3 >/dev/null 2>&1; then
        if command -v brew >/dev/null 2>&1; then
            brew install python || { read '?Python installation failed. Press Return to close.'; exit 1; }
        else
            printf 'Install Python 3 from python.org, then open this shortcut again.\n'
            read '?Press Return to close.'
            exit 1
        fi
    fi
    python3 -m venv .venv || { read '?Could not create the Python environment. Press Return to close.'; exit 1; }
fi
.venv/bin/python scripts/launch.py "$@"
result=$?
if (( result != 0 )); then
    read '?DocToData could not start. Review the message above; press Return to close.'
fi
exit $result
