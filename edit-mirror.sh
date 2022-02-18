#!/usr/bin/env bash

dir="$(dirname "$0")/edit-mirror-repo"
name="$(basename "$0")"
cmd=$1

shift

usage() {
  echo "Usage: $name <command>"
  echo
  echo "Most useful commands:"
  echo "  elm       Wraps the 'elm' command to track compilations"
  echo "  help      Shows this help information"
  echo "  init      Initializes Edit Mirror for a project (use in project root)"
  echo "  redact    Redacts sensitive information in Edit Mirror logs (use in project root)"
  echo
  echo "Other commands: check, id, language-server, uid-gen, update"
  echo
  echo "Please see https://github.com/plait-lab/edit-mirror/tree/main/docs for more documentation!"
}

case $cmd in
  "")
    usage
    ;;
  "check")
    bash $dir/utils/check.sh $@
    ;;
  "elm")
    bash $dir/utils/elm.sh $@
    ;;
  "help")
    usage
    ;;
  "id")
    node $dir/utils/id.js $@
    ;;
  "init")
    bash $dir/utils/init.sh $@
    ;;
  "language-server")
    node $dir/language-server/index.js $@
    ;;
  "redact")
    node $dir/redactor/index.js $@
    ;;
  "uid-gen")
    node $dir/utils/uid-gen.js $@
    ;;
  "update")
    bash $dir/utils/update.sh $@
    ;;
  *)
    echo "Invalid command"
    echo
    usage
    exit 1
    ;;
esac
