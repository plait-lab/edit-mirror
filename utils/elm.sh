#!/usr/bin/env bash

timestamp=$(date +%s)

elm "$@"
code=$?

logdir="___edit-mirror___/log"

if [[ -d "$logdir" && "$1" == "make" ]]; then
  elm "$@" --report=json \
    1> $logdir/${timestamp}_compile_stdout.json \
    2> $logdir/${timestamp}_compile_stderr.json
  echo $? > $logdir/${timestamp}_compile_exitcode.json
fi

exit $code
