/**
 * Where this build runs, set by `DEPLOY_TARGET` at build time (see `shared/vite/deploy-target.ts`).
 * `pages` is the old origin `https://fixmyberlin.github.io`, which holds the users' localStorage.
 */
export const isPagesDeploy = import.meta.env.VITE_DEPLOY_TARGET === 'pages'
