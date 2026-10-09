---
name: automate-suite
description: Automate the manual cases of one Testomat suite as Playwright specs in tests/e2e - plan, stop for approval, implement, independent review. Use when asked to automate a Testomat suite or its cases for this plugin.
argument-hint: <Testomat suite title, e.g. view_item>
disable-model-invocation: true
---

# Automate a Testomat suite

Suite: **$ARGUMENTS**

The rules for writing specs are in `tests/e2e/README.md`. Read it in full
before step 1; this skill is the procedure and doesn't repeat them.

## 0. Before anything

- The current branch must not be `master`. If it is, stop and ask which task
  branch to use.
- The e2e store must answer on http://localhost:8889. If it doesn't, start it
  with `npm run env:e2e:start` (about a minute). If that fails because Docker
  isn't running, stop and ask to start Docker.
- If the preflight fails with "plugin is not active" right after a branch
  switch, restart the store: `npm run env:e2e:stop && npm run env:e2e:start`.

## 1. Plan

1. Find the suite in Testomat (project `stape-integrations`, under
   `CMS / WordPress`). If its title matches more than one suite, ask which.
2. Read every case of the suite from Testomat, in full. Testomat is the only
   source: don't use local drafts or copies of the cases.
3. Take the cases with state `manual` and without the `known-defect` tag.
   List the others with the reason they are skipped.
4. For each case taken, write:
   - the test title: the case title, then ` @T<id>`;
   - its Store settings group (README.md) and, if it isn't 1, why;
   - every Expected result line, each mapped to the assertion that checks it;
   - what has to be added: fixtures, product types, page objects, keys in
     `STORE_OPTIONS` (with the checks README.md asks for);
   - anything that can't be automated as written, and why.
5. Check behaviour you are unsure of on the e2e store, not by reading code
   alone. Leave the store as you found it.
6. End the plan with **Questions**: every mismatch between a case and
   README.md (its "The case and these rules" section lists the usual ones),
   and every place you'd rather not follow a README rule. For each: what
   differs, the options, your recommendation. Don't settle any of them
   yourself. If there are none, say so.

**Stop here.** Show the plan as text, then ask the questions with the
AskUserQuestion tool: one question per mismatch, 2-4 options, the
recommended option first with "(Recommended)" in its label. It takes up to
4 questions per call, so ask in batches when there are more. Then ask
whether the plan is approved, and wait.

## 2. Implement

After the plan is approved, with any changes asked for:

1. Write the specs (one file for the suite) and what they need, following the
   answers. An answer that applies beyond its case goes into README.md too.
2. Run `npm run lint:e2e`, `npm run typecheck:e2e` and the whole suite
   (`npm run test:e2e`). An `eslint-disable` needs a reason after `--`, and
   only where README.md allows one.
3. Run the new specs next to the existing ones:
   `npx playwright test --repeat-each=5 --workers=4`. Every run must pass.
4. For each new test, break one expected value in the test, confirm the test
   fails on it, and put it back. Change only the test, never the plugin's
   code.
5. Don't change existing specs unless the plan said so.

## 3. Review

Start a subagent with a fresh context (it must not see this conversation) and
give it this task:

```
Review the diff of the current branch against master as a strict reviewer
who didn't write it. Don't edit anything.

Read tests/e2e/README.md first, and read every automated case from Testomat
(project stape-integrations; ids from the @T tags in the test titles).

Check:
1. Each test asserts every Expected result line of its case, with the values
   the case gives.
2. npm run lint:e2e passes, and every eslint-disable comment gives a reason
   README.md accepts.
3. The README rules lint can't check: locator priority and narrowing by
   container, waits in page objects, whole events with toEqual, builders
   that don't compute what the plugin computes, new code in the layer that
   owns it, Store settings groups.
4. Nothing depends on store state the test doesn't create (other products,
   list positions, settings changed in the database).
5. Titles match Testomat exactly, followed by @T<id>.
6. Every place the specs depart from a case or from README.md is one the
   plan asked about; list any other as must-fix. The approved ones are:
   <paste the plan's questions and the answers here>.

List findings with file, problem, fix and severity (must-fix / should-fix /
nit).
```

Fix every must-fix and should-fix, then rerun step 2.2 and 2.3.

## 4. Report

Show: the cases automated with their test titles, the cases left manual and
why, the review findings and what was done with each, and a proposed commit
message. Commit and push only when asked.

Testomat switches a case to `automated` by itself once a CI run reports a
result for its `@T<id>` tag; nothing to do there.
