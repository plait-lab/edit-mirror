# The Edit Mirror redactor

The Edit Mirror redactor automatically redacts all occurrences of a phrase
from your _locally-stored_ Edit Mirror logs.

If at any point you wish to retroactively apply a redaction to _uploaded_ data,
please email Justin Lubin at
[justinlubin@berkeley.edu](mailto://justinlubin@berkeley.edu),
but do not include the information to be redacted in the email. We will ensure
that we redact the relevant information in a secure way that respects your
confidentiality. 

## How to use

In the situation that you accidentally type sensitive information such as a
password to an Elm file, it is important that you redact it before consenting to
upload any more data.

To do so, use your terminal to navigate to the root of the project where you
entered the sensitive information and run the command

    edit-mirror redact

with no further arguments. Then simply type in the phrase to redact at the
prompt that appears.

**Be sure not to enter the sensitive phrase as an argument to this program.**
If you do, it will be stored in your shell's command history.

## Will this really remove all occurrences of my passphrase?

**Short answer:** In almost all cases, the answer is yes, but it is always good
to check the `___edit-mirror/log` directory to be sure.

**Long answer:** We do not naïvely scrub all occurrences of the sensitive phrase
from the logs. Consider the situation where your phrase is `codeword` and your
edit history looks something like this:

- `let password = "my password is  in ...`
- `let password = "my password is c in ...`
- `let password = "my password is co in ...`
- `let password = "my password is cod in ...`
- `let password = "my password is code in ...`
- `let password = "my password is codew in ...`
- `let password = "my password is codewo in ...`
- `let password = "my password is codewor in ...`
- `let password = "my password is codeword in ...`
- `let password = "my password is codeword! in ...`
- `let password = "my password is codeword!" in ...`

Our redactor would transform this history into the following:

- `let password = "my password is  in ...`
- `let password = "my password is ##### REDACTED:<timestamp> ##### in ...`
- `let password = "my password is ##### REDACTED:<timestamp> ##### in ...`
- `let password = "my password is ##### REDACTED:<timestamp> ##### in ...`
- `let password = "my password is ##### REDACTED:<timestamp> ##### in ...`
- `let password = "my password is ##### REDACTED:<timestamp> ##### in ...`
- `let password = "my password is ##### REDACTED:<timestamp> ##### in ...`
- `let password = "my password is ##### REDACTED:<timestamp> ##### in ...`
- `let password = "my password is ##### REDACTED:<timestamp> ##### in ...`
- `let password = "my password is ##### REDACTED:<timestamp> #####! in ...`
- `let password = "my password is ##### REDACTED:<timestamp> #####!" in ...`

Our algorithm tracks where each letter that constitutes your phrase to redact
originates from, then goes back in time and redacts all occurrences of those
particular letters as well.
