// The two-tab way of working: the room board in one tab (often full screen), the work (sessions,
// notes, programs) in another. Each tab gets a name (TabName), and the links in the top bar go to
// the tab with that name (TabLink): «Αίθουσα» from the work tab switches to the board tab instead of
// leaving the page you're on; «Νέα συνεδρία» switches to the work tab, and «Κλινική» (the clinic's
// settings) has a tab of its own. So the board tab only ever shows the board.
// No such tab yet (closed, or never opened) → the browser opens a new one with that name.
export const BOARD_TAB = "physiopath-board";
export const WORK_TAB = "physiopath-work";
export const CLINIC_TAB = "physiopath-clinic";
