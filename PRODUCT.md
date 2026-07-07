# Product

## Register

product

## Users

Jacob and his partner — two people using it as a shared-but-personal daily driver. Context: evenings and study sessions, usually on a laptop, often with the app open for long stretches (the focus timer running while working). Each surface is used by someone in a task: starting a study session, checking the week, logging a period day, glancing at spending.

## Product Purpose

muffin-time is a study/focus companion first: the focus timer with per-subject tracking is the heart of the app, and the calendar (events), tasks, stats, and lifestyle tabs (period, budgeting, health) orbit around it. Success on any given day: a study session was started without friction, and the supporting views (what's due, what's coming up, how the cycle/budget looks) answered their question in one glance.

## Brand Personality

Cozy, calm, personal. A quiet nighttime study den for two — the cosmic night theme (midnight/void backgrounds, gold and stardust-purple accents, serif page titles) is atmosphere, not spectacle. Warm and intimate rather than energetic; unhurried rather than gamified. Small touches of charm (the cat, the moon loader) are welcome as moments, not as the main event.

## Anti-references

- **Gamified habit apps** (Duolingo, Habitica): no streak-guilt mechanics, badges, confetti, or nagging. Motivation comes from the calm of the space, not pressure.
- **Clinical health apps**, especially for the period/health tabs: no sterile medical UI, alarming reds, or data-heavy coldness. Cycle tracking should feel as personal and gentle as the rest of the app.
- **Generic gray SaaS dashboards** are also off-tone: the app should never lose its night-sky identity to corporate neutrality.

## Design Principles

1. **Atmosphere serves focus.** The cosmic theme sets the mood, then gets out of the way. Any decoration that competes with the task at hand (blur over text, glow over data) loses.
2. **One glance, one answer.** Each view exists to answer a question fast — what's next, how long have I studied, where is the cycle. Density is fine; ambiguity is not.
3. **Gentle, never nagging.** No guilt mechanics, no urgency theater. Empty states and zero-progress days are neutral or warm, never scolding.
4. **Personal over polished-generic.** When choosing between a standard-issue pattern and one that keeps the app's handmade, for-us character, keep the character — as long as the affordance stays familiar.
5. **Consistent vocabulary.** The glass-panel surface, gold primary action, and stardust accent mean the same thing on every screen. New features adopt the existing language before inventing new pieces.

## Accessibility & Inclusion

Practical baseline: WCAG AA contrast for text on the dark theme (watch muted purples on midnight), `prefers-reduced-motion` respected everywhere (already established in index.css), and keyboard-usable dialogs and pickers. No formal audit required, but nothing shipped that's illegible or motion-hostile.
