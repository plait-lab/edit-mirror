# Installing Edit Mirror

Thank you for participating in our research study!

If you have any questions about the following installation instructions, please
do not hesitate to reach out to me, Justin Lubin, at
[justinlubin@berkeley.edu](mailto://justinlubin@berkeley.edu)!

## Dependencies

Before going through these installation instructions, please make sure you have
the following programs installed:

- `bash`
- `git`
- `node`
- `npm` (with `node` at least `v16`)

## Overview

Participation in this study entails using an editor plugin we made called _Edit
Mirror_ that logs the edits you make to aprogramming project of your choice. We
implemented this plugin using the language server protocol (LSP), so you should
be able to use this plugin with any editor that supports the LSP.

All code that you will install on your computer for this study is open source,
non-obfuscated, and accessible via the [Edit Mirror repository](https://github.com/plait-lab/edit-mirror).
If you have concerns about the security of the code that you will install, we
encourage you to browse this repository yourself or send Justin Lubin an email
at [justinlubin@berkeley.edu](mailto://justinlubin@berkeley.edu).

Here is an overview of the installation process (described in more detail
below):

1. Install the Edit Mirror utility suite, which includes tools like the
   _Edit Mirror language server_ and an _automated redactor_ (in case you type
   sensitive information into your editor).
2. Configure your editor to be a language client for the Edit Mirror language
   server.
3. Initialize Edit Mirror in the project root of your programming project of
   choice.
4. Replace any references to the `elm` binary in your build scripts with a
   lightweight wrapper around the `elm` binary we wrote that is included in the
   Edit Mirror utility suite.

This process will result in the following files being created on your machine:

- In a directory of your choice on your `PATH` (default `~/bin`):
  - `edit-mirror` (the Edit Mirror utility suite program)
  - `edit-mirror-repo` (a directory containing supporting files for the Edit
    Mirror utility suite)
- In the project root of your programming project of choice:
  - `___edit-mirror___` (a directory storing Edit Mirror data and metadata,
    including log data that has not yet been uploaded)

To uninstall Edit Mirror, simply remove these files as well as any
editor-specific configurations you made and plugins you installed.

## Part 1: Installing the Edit Mirror utility suite

For this step, you will run our
[Edit Mirror language server installation script](../utils/install.sh),
which will ask you a couple basic configuration and demographic
questions.

Two quick notes about the installation script:

- Please ensure that the installation directory you choose is on your `PATH`.
    - The default installation directory is `~/bin` (the `bin` folder in your
      home directory, not the root of your file system). To add this directory
      to your path in a `bash`-like shell, add the line
      `export PATH=~/bin:$PATH` to your shell's configuration file (such as
      `~/.bashrc` or `~/.zshrc`).
- The script will ask you for your Edit Mirror ID; this should have been
  provided to you in an email from Justin Lubin
  [justinlubin@berkeley.edu](mailto://justinlubin@berkeley.edu).
  If not, please reach out to Justin via email.

Assuming you use a `bash`-like shell, an easy way to run the installation script
is to execute the following command in your terminal (although we encourage you
to review the short [installation script](https://raw.githubusercontent.com/plait-lab/edit-mirror/main/utils/install.sh)
yourself to ensure that it meets your standards for security before running it):

    bash <(curl --proto '=https' -sSfL https://raw.githubusercontent.com/plait-lab/edit-mirror/main/utils/install.sh)

For information about how to use the Edit Mirror utilities (including the
automated redactor), please refer to our [documentation](./) or simply type

    edit-mirror

in your terminal once installation has completed. (On Windows, you may need
to run `bash edit-mirror` instead of just `edit-mirror` throughout this
documentation.)

**We strongly recommend that you review the
[documentation for our automated redactor tool](./redactor.md).**

To double check that everything is set up properly, you can run

    edit-mirror check

in your terminal.

If everything is set up properly, you will see the following lines of text:

    [SUCCESS] Sucessfully connected to the Edit Mirror Backend.
    [SUCCESS] Your Edit Mirror ID was recognized as valid by the backend.

If you do not see these lines of text, please reach out to Justin Lubin at
[justinlubin@berkeley.edu](mailto://justinlubin@berkeley.edu).

## Part 2: Configuring your editor to be a language client

At a high level, here is what you need to do to configure any editor that
supports the LSP to be an Edit Mirror language client:

1. Install an LSP plugin for your editor (if you haven't already).
2. Configure the LSP plugin to use the Edit Mirror language server for Elm
   (`.elm`) files. Since the Edit mirror language server should already be on
   your `PATH`, you should be able to simply tell your LSP plugin to run the
   command `bash edit-mirror language-server`.

We've provided some tips for a few editors below, but the two steps listed
above should apply to any editor that supports the LSP!

### Visual Studio Code

For Visual Studio Code, all you need to do is install the
[Elm language plugin](https://marketplace.visualstudio.com/items?itemName=Elmtooling.elm-ls-vscode)
and the
[Edit Mirror language client plugin](https://marketplace.visualstudio.com/items?itemName=plait-lab.edit-mirror).

### Vim

For Vim, we strongly recommend using the
[LanguageClient-neovim](https://github.com/autozimu/LanguageClient-neovim)
language client. You can install `LanguageClient-neovim` with the
[`vim-plug`](https://github.com/junegunn/vim-plug) package manager by including
the following configuration in your `vimrc` file:

    Plug 'autozimu/LanguageClient-neovim', {
      \ 'branch': 'next',
      \ 'do': 'bash install.sh',
      \ }

Then, add the following configuration to your `vimrc` file:

    let g:LanguageClient_serverCommands = {
      \ 'elm': ['bash', 'edit-mirror', 'language-server'],
      \ }

    let g:LanguageClient_rootMarkers = {
      \ 'elm': ['elm.json'],
      \ }

If you are already using `LanguageClient-neovim` for Elm language support, we
recommend installing a second language client so that you can run both language
servers at the same time.

### Emacs

For Emacs, we recommend using the
[`lsp-mode`](https://emacs-lsp.github.io)
language client.  You can install `lsp-mode` by typing `M-x package-install`,
hitting enter, then typing `lsp-mode`.

Additionally, if you don't already have it installed, you will need to install
[`elm-mode`](https://github.com/jcollard/elm-mode)
by typing `M-x package-install` then `elm-mode`.

Finally, enter the following in your Emacs configuration file (either `~/.emacs`
or `~/.emacs/init.el`):

    (require 'lsp-mode)
    (with-eval-after-load 'lsp-mode
      (lsp-register-client
        (make-lsp-client
          :new-connection (lsp-stdio-connection '("bash" "edit-mirror" "language-server"))
          :major-modes '(elm-mode)
          :server-id 'edit-mirror
          :priority 10)))
    (add-hook 'elm-mode-hook #'lsp)

## Part 3: Initializing Edit Mirror for your programming project

Please perform the following steps:

1. In your terminal, navigate to the project root of the programming project
   that you wish to have Edit Mirror track. For our purposes, the project root
   is the directory containing your `elm.json` file.
2. Run the following command:

       edit-mirror init

If you would like to use Edit Mirror with multiple programming projects, please
feel free to repeat this step for other project roots.

## Part 4: Using the Edit Mirror `elm` wrapper

_**Note:** If you are using a compiler other than the official `elm` binary
(for example, `elm-pages` or `elm-optimize-level-2`) or you cannot change
your build script to use a different `elm` executable, then **please ignore this
step and tell Justin Lubin which compiler you are using** via an email to
[justinlubin@berkeley.edu](mailto://justinlubin@berkeley.edu)._

For the final step of installation, please replace any use of the `elm` binary
in your build scripts or workflow for your chosen project with the command
`edit-mirror elm`. Also,
**please make sure that you run this command from your project root!**

For example, instead of running `elm make` to build your project, you would run
`edit-mirror elm make`.

If you haven't already, we recommend wrapping your build command in a
`Makefile` or `build.sh` file so you can keep your build command short and not
worry about needing to use our `elm` wrapper.

---

And that's it, you've successfully installed Edit Mirror! Thank you once again
for your participation in this study, and happy coding!

— Justin Lubin
([justinlubin@berkeley.edu](mailto://justinlubin@berkeley.edu))

## Troubleshooting

### `Error: Cannot find module` ... `requireStack: []`

Upon trying to run the Edit Mirror plugin, a few participants have encountered
an error message similar to the following:

    Error: Cannot find module '<some path here>/index.js'
				at Module._resolveFilename (node:internal/modules/cjs/loader:<number>:<number>)
				at Module._load (node:internal/modules/cjs/loader:<number>:<number>)
				at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:<number>:<number>)
				at node:internal/main/run_main_module:<number>:<number> {
			code: 'MODULE_NOT_FOUND',
			requireStack: []
		}

To fix this issue, please set the environment variable `EDIT_MIRROR_DIR` to the
installation directory that you selected in Step 1 in your shell's configuration
file.

For example, if you are using `bash` and you chose an installation directory
of `~/bin`, you would add the following line to `~/.bashrc`:

		export EDIT_MIRROR_DIR=~/bin
