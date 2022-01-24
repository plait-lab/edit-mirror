#!/usr/bin/env bash

dir="$(dirname $(realpath "$0"))"
name="$(basename "$0")"
cmd=$1

shift
cd $dir

usage() {
  echo "Usage: $name <elm|language-server|update> [options]"
}

case $cmd in
  "")
    usage
    ;;
  "elm")
    bash utils/elm.sh $@
    ;;
  "language-server")
    node language-server/index.js $@
    ;;
  "update")
    bash utils/update.sh $@
    ;;
  *)
    echo "Invalid command"
    usage
    exit 1
    ;;
esac
