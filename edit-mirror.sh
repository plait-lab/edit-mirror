#!/usr/bin/env bash

usage="Usage: $name <check|elm|help|id|init|language-server|redact|uid-gen|update> [options]"
help="Please see https://github.com/justinlubin/edit-mirror for documentation!"
# TODO update url^

dir="$(dirname $(realpath "$0"))"
name="$(basename "$0")"
cmd=$1

shift

case $cmd in
  "")
    echo $usage
    echo $help
    ;;
  "check")
    bash $dir/utils/check.sh $@
    ;;
  "elm")
    bash $dir/utils/elm.sh $@
    ;;
  "help")
    echo $usage
    echo $help
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
    >&2 echo "Invalid command"
    >&2 echo $usage
    exit 1
    ;;
esac
