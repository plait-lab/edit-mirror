#!/usr/bin/env bash

timestamp=$(date +%s)

elm "$@"
code=$?

if [ "$1" == "make" ]; then
  logdir="___edit-mirror___/log"

  elm "$@" --report=json \
    1> $logdir/$timestamp-compile-stdout \
    2> $logdir/$timestamp-compile-stderr
  echo $? > $logdir/$timestamp-compile-exitcode
fi

exit $code
