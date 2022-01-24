#!/usr/bin/env bash

cd "$(dirname "${BASH_SOURCE[0]}")"

# TODO: this script should be run from the root directory, it shouldn't need to
# be in the plugin directory
if [[ $(basename "$PWD") != "___edit-mirror___" ]]; then
  echo "Error: please ensure that this script is located in the ___edit-mirror___ directory."
  exit 1
fi

read -p "Phrase to redact (blank to cancel): " phrase

timestamp=$(date +%s)
pattern="s/$phrase/#####REDACTED-$timestamp#####/g"

if [[ -z $phrase ]]; then
  echo "Exiting without redacting anything."
  exit 0
fi

read -p "Are you sure you want to redact that phrase? (y/N) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Exiting without redacting anything."
  exit 0
fi

find test -name '*' -type f -exec perl -i -pe $pattern {} +
echo "Redactions applied!"
echo "Please check the ___edit-mirror___/logs directory to be sure."
