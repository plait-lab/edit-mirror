#!/usr/bin/env bash

usage="Usage: $name <elm|init|language-server|uid-gen|update> [options]"

dir="$(dirname $(realpath "$0"))"
name="$(basename "$0")"
cmd=$1

shift

case $cmd in
  "")
    echo $usage
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
  "uid-gen")
    node $dir/utils/uid-gen.js $@
    ;;
  "update")
    bash $dir/utils/update.sh $@
    ;;
  *)
    >&2 echo "Invalid command"
    >&2 echo $usage
    exit 1
    ;;
esac
