/** Conventional Commits, as produced by `npm run commit` (commitizen). */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Generated-model commits carry a lot of context; leave room for it.
    'body-max-line-length': [1, 'always', 100],
  },
};
