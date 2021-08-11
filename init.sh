#!/usr/bin/env bash

# confirm consent
# ask for id, demographics
# create PLUGIN_DIR and necessary subfolders/files
# download/install lsp
# instruct user to install language client in their editor configured for elm
#    - need to look into having both the official lsp and my lsp installed for
#      elm
# put the elm.sh in PATH correctly somehow

# directory structure
#
# ___edit-mirror___
#   logs/
#     files/
#     compilations/
#   id.txt
#   demographics.txt
#   .gitignore
#   last_upload_attempt.txt

em=___edit-mirror___
id=0
exp=5

mkdir $em
mkdir $em/logs
mkdir $em/logs/files
mkdir $em/logs/compilations
echo $id > $em/id.txt
echo "Experience: $exp" > $em/demographics.txt
echo "/*" > $em/.gitignore
echo "0" > $em/last_upload_attempt.txt
