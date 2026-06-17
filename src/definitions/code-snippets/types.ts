/**
 * Code snippet metadata shown to users in the demo pages.
 *
 * Each demo curates 2-3 of these entries (setup / handlers / Demo.vue) to
 * surface the key implementation logic instead of dumping full source.
 */
export interface CodeFile {
  /** Display filename, e.g. `setup.ts`, `handlers.ts`, `Demo.vue`. */
  filename: string
  /** Raw source (multi-line string) shown verbatim in the viewer. */
  content: string
}
