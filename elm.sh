#!/usr/bin/env bash

timestamp=$(date +%s)

elm "$@"
code=$?

if [ "$1" == "make" ]; then
  cl="log/compilation_log/"
  mkdir -p $cl

  elm "$@" --report=json \
    1> $cl/$timestamp-stdout \
    2> $cl/$timestamp-stderr
  echo $? > $cl/$timestamp-exitcode
fi

exit $code
