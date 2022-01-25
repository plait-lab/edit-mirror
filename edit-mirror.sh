#!/usr/bin/env bash

dir="$(dirname $(realpath "$0"))"
name="$(basename "$0")"
cmd=$1

shift

usage() {
  echo "Usage: $name <elm|init|language-server|update> [options]"
}

case $cmd in
  "")
    usage
    ;;
  "elm")
    bash $dir/utils/elm.sh $@
    ;;
  "init")
    bash $dir/utils/init.sh $@
    ;;
  "language-server")
    node $dir/language-server/index.js $@
    ;;
  "update")
    bash $dir/utils/update.sh $@
    ;;
  *)
    echo "Invalid command"
    usage
    exit 1
    ;;
esac
