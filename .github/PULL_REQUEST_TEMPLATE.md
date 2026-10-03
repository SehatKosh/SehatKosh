## 📋 Description
<!-- A clear summary of what this PR does and why it is needed. -->

Closes # <!-- Issue number, e.g. Closes #42 -->

---

## ✅ Checklist
<!-- Check every box before requesting a review. -->

### Code Quality
- [ ] My code follows the project style (`pnpm lint` passes with zero errors)
- [ ] TypeScript types pass (`tsc --noEmit` has no errors) for any frontend changes
- [ ] Python linter passes (`flake8 app/`) for any backend changes
- [ ] No `console.log`, `print`, or `TODO` left behind in production paths

### Testing
- [ ] I have added or updated unit tests for any new backend logic
- [ ] `pytest -v` passes locally for backend changes
- [ ] I have manually tested the relevant UI flow for frontend changes

### Branching
- [ ] This PR targets `dev` (not `main` directly)
- [ ] My branch follows the naming convention: `feat/`, `fix/`, `test/`, or `docs/`
- [ ] I have rebased on the latest `dev` before opening this PR

### Documentation
- [ ] I have updated relevant comments and docstrings
- [ ] If I added a new env variable, I have added it to `.env.example`

---

## 🧪 How to Test
<!-- Step-by-step instructions for a reviewer to verify this PR works. -->

1.
2.
3.

---

## 📸 Screenshots / Videos (if UI change)
<!-- Attach before/after screenshots or a screen recording. -->

---

## 🔗 Related PRs / Issues
<!-- List any related PRs or issues. -->
