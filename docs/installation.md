# Installing Edit Mirror

Thank you for participating in our research study!

If you have any questions about the following installation instructions, please
do not hesitate to reach out to me, Justin Lubin, at
[justinlubin@berkeley.edu](mailto:////justinlubin@berkeley.edu)!

## Dependencies

Before going through these installation instructions, please make sure you have
the following programs installed:

- `bash`
- `git`
- `node`
- `npm`

## Overview

Participation in this study entails using an editor plugin we made called _Edit
Mirror_ that logs the edits you make to an open source programming project of
your choice. We implemented this plugin using the language server protocol
(LSP), so you should be able to use this plugin with any editor that supports
the LSP.

Here is an overview of the installation process (described in more detail
below):

1. Install the Edit Mirror utility suite, which includes tools like the
   _Edit Mirror language server_ and an _automated redactor_ (in case you type
   sensitive information into your editor).
2. Configure your editor to be a language client for the Edit Mirror language
   server.
3. Initialize Edit Mirror in the project root of your open source programming
   project of choice.
4. Replace any references to the `elm` binary in your build scripts with a
   lightweight wrapper around the `elm` binary we wrote that is included in the
   Edit Mirror utility suite.

This process will result in the following files being created on your machine:

- In a directory of your choice on your `PATH` (default `~/bin`):
  - `edit-mirror` (the Edit Mirror utility suite program)
  - `edit-mirror-repo` (a directory containing supporting files for the Edit
    Mirror utility suite)
- In the project root of your open source programming project of choice:
  - `___edit-mirror___` (a directory storing Edit Mirror data and metadata,
    including unuploaded log data)

To uninstall Edit Mirror, simply remove these files as well as any
editor-specific configurations you made and plugins you installed.

## Part 1: Installing the Edit Mirror utility suite

For this step, you will run our
[Edit Mirror language server installation script](../utils/install.sh),
which will ask you a couple basic configuration and demographic
questions.

Two quick notes about the installation script:

- Please ensure that the installation directory you choose is on your `PATH`.
- The script will ask you for your Edit Mirror ID; this should have been
  provided to you in an email from Justin Lubin
  [justinlubin@berkeley.edu](mailto:////justinlubin@berkeley.edu).
  If not, please reach out to Justin via email.

An easy way to run the installation script is to execute the following command
in your terminal:

    bash <(curl --proto '=https' -sSfL https://raw.githubusercontent.com/plait-lab/edit-mirror/main/utils/install.sh)

For information about how to use the Edit Mirror utilities (including the
automated redactor), please refer to our [documentation](./) or simply type

    edit-mirror

in your terminal.

**We strongly recommend that you review the
[documentation for our automated redactor tool](./redactor.md).**

## Part 2: Configuring your editor to be a language client

At a high level, here is what you need to do to configure any editor that
supports the LSP to be an Edit Mirror language client:

1. Install an LSP plugin for your editor (if you haven't already).
2. Configure the LSP plugin to use the Edit Mirror language server for Elm
   (`.elm`) files. Since the Edit mirror language server should already be on
   your `PATH`, you should be able to simply tell your LSP plugin to run the
   command `edit-mirror-lsp-server`.

We've provided some tips for a few editors below, but the two steps listed
above should apply to any editor that supports the LSP!

### Visual Studio Code

For Visual Studio Code, all you need to do is install the
[Edit Mirror language client plugin](https://marketplace.visualstudio.com/items?itemName=plait-lab.edit-mirror).

TODO: Need to install Elm plugin?

### Vim

For Vim, we strongly recommend using
[LanguageClient-neovim](https://github.com/autozimu/LanguageClient-neovim).
In your `vimrc` file, you would then use the following configuration:

    let g:LanguageClient_serverCommands = {
      \ 'elm': ['edit-mirror-lsp-server'],
      \ }

    let g:LanguageClient_rootMarkers = {
      \ 'elm': ['elm.json'],
      \ }

If you are already using LanguageClient-neovim for Elm language support, we
recommend installing a second language client so that you can run both language
servers at the same time.

## Part 3: Initializing Edit Mirror for your programming project

Please perform the following steps:

1. In your terminal, navigate to the project root of the open source
   programming project that you wish to have Edit Mirror track. (The project
   root is likely the directory containing your `elm.json` file!)
2. Run the following command:

       edit-mirror init

If you would like to use Edit Mirror with multiple open source programming
projects, please feel free to repeat this step for the other project roots!

## Part 4: Using the Edit Mirror `elm` wrapper

For the final step of installation, please replace any use of the `elm` binary
in your build scripts or workflow with the command `edit-mirror elm`.

For example, instead of running `elm make` to build your project, please run
`edit-mirror elm make`.

If you haven't already, we recommend wrapping your build command in a
`Makefile` or `build.sh` file so you can keep your build command short and not
worry about needing to use our `elm` wrapper.

---

And that's it, you've successfully installed Edit Mirror! Thank you once again
for your participation in this study, and happy coding!

— Justin Lubin
([justinlubin@berkeley.edu](mailto:////justinlubin@berkeley.edu))
