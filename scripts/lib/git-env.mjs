// Git exports GIT_DIR, GIT_WORK_TREE and friends to hook scripts. A test that
// creates throwaway repositories must not inherit them: `git -C <tmp>` honours
// GIT_DIR over the working directory, so a suite run from the pre-push hook
// would commit into the caller's repository. Scrubbing the variables keeps a
// hook run and a manual run identical.

const GIT_ENV = [
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_COMMON_DIR',
  'GIT_NAMESPACE',
  'GIT_PREFIX',
];

/** A copy of `env` without the Git plumbing variables, for a child process. */
export function cleanGitEnv(env = process.env) {
  const clean = { ...env };
  for (const name of GIT_ENV) delete clean[name];
  return clean;
}

/** Remove the Git plumbing variables from this process and its children. */
export function scrubGitEnv(env = process.env) {
  for (const name of GIT_ENV) delete env[name];
  return env;
}
