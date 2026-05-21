---
name: deploy
description: Deploy to staging environment
disable-model-invocation: true
---

Run through our staging deployment checklist.

## Pre-deployment
- Run test suite: `npm test`
- Check for console.logs: `grep -r "console.log" src/`
- Build production bundle: `npm run build`
- Verify environment variables are set

## Deployment Steps
1. Create deployment branch from main
2. Tag release: `git tag -a v$ARGUMENTS -m "Release $ARGUMENTS"`
3. Push to staging: `git push origin staging`
4. Monitor deployment: Check #deployments channel

## Post-deployment
- Smoke test critical paths
- Check error monitoring dashboard
- Notify team in #releases
