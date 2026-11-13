# Death Quips

Every time you die, a short remark pops up at the top of the screen. The line depends on how the run went:

- **Under 10%** gets a shrug.
- **Mid-level deaths** get some encouragement.
- **80% and up** gets sympathy.
- **95% and up** gets what it deserves.
- **A new best** is celebrated in gold.
- **Platformer** and **practice mode** have their own lines.

A small second line shows the attempt number and the percent you died at.

## Settings

- Turn quips on or off, and choose whether they show in practice mode.
- Only show quips past a minimum percent, so early deaths stay quiet.
- Change the text size and how long a quip stays on screen.
- Add your own lines, separated by `|`. Use `{percent}` and `{attempt}` to insert the current values:

  `Attempt {attempt} was a mistake | {percent}% is a number, I guess`

- Use only your own lines instead of mixing them with the built-in ones.
