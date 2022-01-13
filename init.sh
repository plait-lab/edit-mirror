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
echo "/*" > $em/.gitignore

mkdir $em/log
mkdir $em/info

echo $id > $em/info/id.txt
echo "Experience: $exp" > $em/info/demographics.txt
echo "0" > $em/info/last-upload-request.txt

echo "Edit Mirror setup has completed."
