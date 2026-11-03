# Daily operations: recurring plans and historical reports

The Operations tab reuses the existing React app, Firebase Authentication,
Firestore, permissions editor, image compression and ExcelJS dependency. It
does not require a new server, scheduled function, paid integration or a new
hosting provider.

## Workflow

1. A plan manager opens **الخطط والمعايير** and reviews reference tasks.
2. Unambiguous tasks can be activated together for the selected filters.
   Conflicting shifts, unspecified pest-control visit days and monthly cleaning
   tasks with no assigned shift require individual review first.
3. Activation persists its start date once. Opening the app on a later day does
   not reset it or invent historical execution records.
4. **أعمال اليوم** uses Africa/Cairo, refreshes the date every 30 seconds, and
   lists each due task for that shift. Landscape, Spider and pest control are
   morning only, enforced in the UI and Firestore rules.
5. Staff record done, partial, blocked or not required. Pending is distinct
   from a recorded failure. Partial/blocked requires a reason, corrective action
   and follow-up date; exclusions require a reason.
6. Quality acceptance is separate and requires review privileges. Any later
   staff update resets quality to unreviewed. Images are compressed locally,
   limited to two, and kept within the Firestore document size budget.
7. Reports choose a day, Saturday–Friday week or calendar month and export
   all matching rows, including rows beyond screen pagination. Future tasks
   are labelled separately and excluded from the completion denominator.

## Data and history

- `operations_plans/{planId}`: immutable recurring task definition, department,
  location, shift, standard, recurrence, source and activation date. Retirement
  sets an end date without erasing historical requirements. Changes to task
  definitions use a new plan, preserving old definitions.
- `operations_execution/{planId}__{YYYY-MM-DD}`: one saved occurrence per due
  date, with a snapshot of its plan, execution result, owner, evidence, review
  result, actual follow-up date, server update timestamp and append-only history.
- Transactions check a revision number so stale editors cannot overwrite a
  colleague's changes. The late completion remains attached to its original
  due date.

The completion rate is fully completed due tasks / required due tasks, excluding
recorded not-required items. Partial work does not count as complete. Quality
acceptance is shown separately. Monthly day 29/30/31 rules run only when that
day exists, rather than silently moving to another date.

## Source preparation

`src/operations/seed.json` contains recurrent reference tasks extracted from the
uploaded housekeeping shift workbook, monthly cleaning workbook, pest-control
PDF and landscape/Spider schedule images. No task is tied to October or November.
Numeric monthly cleaning days become monthly recurrence; repeated October
landscape rows collapse to weekly recurrence. Missing/unclear data is flagged.
Existing Park Street inspection criteria supply additional dormant daily
Standards templates in `templates.js`.

Reference tasks start dormant: the real app never treats a reference schedule,
a photo or an imported spreadsheet as evidence of completed work. The preview
uses clearly labelled illustrative records and never contacts Firebase.

## Permissions and rollout

Deploy the reviewed Firestore rules together with the frontend. They protect
operations plans/execution AND the user profiles that authorize access. Profile
registration remains self-service and pending; profile approval/role changes
require user-management privileges. Legacy collections other than `users`
retain their previous policy; this is not a complete legacy security migration.

Do not publish the frontend while leaving the old allow-all rules in place.
Before production rollout, verify an existing admin login, pending account
registration, approval, a supervisor update and a viewer export against staging.
Emulator tests cover these rules but do not establish the rules currently deployed
to the live Firebase project or live deployment credentials.

## Validation

```sh
node --test test/operations.test.js
firebase emulators:exec --only firestore --project demo-parkstreet-ops --config firebase.emulators.json 'node test/operations-rules.test.js'
npm run build
node scripts/buildOperationsPreview.mjs /tmp/ParkStreet_Operations_Preview.html
node scripts/testOperationsPreview.mjs /tmp/ParkStreet_Operations_Preview.html
```

The rules emulator requires a compatible Firebase CLI/Java combination.
The browser test uses Playwright and an installed Chromium; optional environment
selectors are `PLAYWRIGHT_MODULE_PATH` and `CHROMIUM_EXECUTABLE_PATH`.
The standalone HTML preview is generated from the real component with an
in-memory data adapter; it is not a second production app. Its changes are lost
when closed. Browser tests check desktop/mobile layout, save, filters, all-row
printing, Excel downloads and the absence of network requests.
