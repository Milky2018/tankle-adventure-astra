# AGENTS.md

## Gamespec.md maintenance

Apply these rules whenever editing or reorganizing `Gamespec.md`:

- Maintain a complete, coherent description of the current game design, rather than a chronological record of changes.
- Organize sections by subject and in a logical reading order. Keep related rules together and give each design rule one authoritative location.
- Remove redundant, duplicated, obsolete and conflicting content. Resolve superseded designs using the user's latest confirmed decisions; clarify unresolved conflicts rather than inventing a resolution.
- Keep only game design: player experience, story, world and level structure, progression, mechanics, balance, presentation and interface behavior. Keep technology stacks, implementation details, debugging records, test results and development status outside this file.
- Use consistent terminology, remove ambiguity and check dependencies, cross-references and numerical values for internal consistency after edits.
- Preserve confirmed gameplay and numerical values during document cleanup. Propose design changes separately instead of silently introducing them, and never rewrite the design to justify an implementation bug.

## MoonBit project

This is a [MoonBit](https://docs.moonbitlang.com) project.

You can browse and install extra skills here:
<https://github.com/moonbitlang/skills>

### Project Structure

- MoonBit packages are organized per directory; each directory contains a
  `moon.pkg` file listing its dependencies. Each package has its files and
  blackbox test files (ending in `_test.mbt`) and whitebox test files (ending in
  `_wbtest.mbt`).

- In the toplevel directory, there is a `moon.mod` file listing module
  metadata.

### Coding convention

- MoonBit code is organized in block style, each block is separated by `///|`,
  the order of each block is irrelevant. In some refactorings, you can process
  block by block independently.

- Try to keep deprecated blocks in file called `deprecated.mbt` in each
  directory.

### Tooling

- `moon fmt` is used to format your code properly.

- `moon ide` provides project navigation helpers like `peek-def`, `outline`, and
  `find-references`. See $moonbit-agent-guide for details.

- `moon info` is used to update the generated interface of the package, each
  package has a generated interface file `.mbti`, it is a brief formal
  description of the package. If nothing in `.mbti` changes, this means your
  change does not bring the visible changes to the external package users, it is
  typically a safe refactoring.

- In the last step, run `moon info && moon fmt` to update the interface and
  format the code. Check the diffs of `.mbti` file to see if the changes are
  expected.

- Run `moon test` to check tests pass. MoonBit supports snapshot testing; when
  changes affect outputs, run `moon test --update` to refresh snapshots.

- Prefer `assert_eq` or `assert_true(pattern is Pattern(...))` for results that
  are stable or very unlikely to change. For snapshot tests that record
  structured debugging output, derive `Debug` and use `debug_inspect`, rather
  than deriving `Show` for debugging. For solid, well-defined results (e.g.
  scientific computations), prefer assertion tests. You can use
  `moon coverage analyze > uncovered.log` to see which parts of your code are
  not covered by tests.
