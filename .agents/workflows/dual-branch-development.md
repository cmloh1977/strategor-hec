---
description: How to develop features for GALP and HEC branches simultaneously
---

# Dual-Branch Development Workflow

## Branch Structure
```
main-galp  →  strategor-galp.web.app  (Firestore: strategor-galp)
main-hec   →  strategor-hec.web.app   (Firestore: strategor-hec)
```

## Scenario 1: Shared Feature (both GALP and HEC)

Build on **main-galp** first (your primary branch), then cherry-pick to HEC.

```bash
# 1. Develop on GALP
git checkout main-galp
# ... make changes, test ...
git add -A && git commit -m "feat: add export PDF button"

# 2. Cherry-pick to HEC
git checkout main-hec
git cherry-pick main-galp
# Resolve any conflicts (usually color: red→indigo, branding: GALP→HEC)

# 3. Deploy both
git checkout main-galp
// turbo
npm run build && npx firebase-tools deploy --only hosting

git checkout main-hec
// turbo
npm run build && npx firebase-tools deploy --only hosting
```

## Scenario 2: GALP-Only Feature

Work directly on `main-galp`. No cherry-pick needed.

```bash
git checkout main-galp
# ... make changes ...
git add -A && git commit -m "feat(galp): add TTC-specific onboarding"
// turbo
npm run build && npx firebase-tools deploy --only hosting
```

## Scenario 3: HEC-Only Feature

Work directly on `main-hec`. No cherry-pick needed.

```bash
git checkout main-hec
# ... make changes ...
git add -A && git commit -m "feat(hec): add HEC student survey"
// turbo
npm run build && npx firebase-tools deploy --only hosting
```

## Deploying Firestore Rules

For **named databases**, always use database-specific target:

```bash
# GALP rules (from main-galp branch)
// turbo
npx firebase-tools deploy --only firestore:strategor-galp

# HEC rules (from main-hec branch)
// turbo
npx firebase-tools deploy --only firestore:strategor-hec
```

> ⚠️ `firebase deploy --only firestore:rules` does NOT work for named databases!

## Tips to Avoid Conflicts

1. **Commit prefixes**: Use `feat(galp):`, `feat(hec):`, or `feat(shared):` in commit messages
2. **Cherry-pick, don't merge**: Never merge branches; cherry-pick shared commits
3. **Test before deploying**: Always `npm run build` before deploying to catch errors
4. **Stay aware of your branch**: Run `git branch --show-current` before making changes
