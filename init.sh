#!/usr/bin/env bash

# confirm consent
# ask for id, demographics
# create PLUGIN_DIR and necessary subfolders/files
# download/install lsp
# instruct user to install language client in their editor configured for elm
#    - need to look into having both the official lsp and my lsp installed for
#      elm
# put the elm.sh in PATH correctly somehow

# TODO consent

read -e -p "What is your Edit Mirror ID? " id
read -e -p "How many years of experience do you have programming in statically-typed functional programming languages (such as Elm)? " exp

em=___edit-mirror___

mkdir $em
mkdir $em/logs
mkdir $em/logs/current
mkdir $em/logs/current/files
mkdir $em/logs/current/compilations
mkdir $em/logs/pending-upload
echo $id > $em/id.txt
echo "Experience: $exp" > $em/demographics.txt
echo "/*" > $em/.gitignore
echo "0" > $em/last-upload-attempt.txt

echo "Edit Mirror setup has completed."
