# Development Guide

This document outlines the development toolchain, conventions, and testing strategy for the Vagabond RPG Foundry VTT system.

## Tooling Decisions

### Why These Tools?

| Tool                                        | Decision    | Rationale                                                                                                                                            |
| ------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ESLint**                                  | ✅ Adopted  | Industry standard for JavaScript linting. Catches bugs before runtime, enforces consistent patterns.                                                 |
| **@typhonjs-fvtt/eslint-config-foundry.js** | ✅ Adopted  | Foundry-specific ESLint plugin that knows about Foundry globals (`game`, `CONFIG`, `canvas`, etc.). Prevents accidentally shadowing core APIs.       |
| **Prettier**                                | ✅ Adopted  | Opinionated formatter eliminates style debates. Consistent code regardless of contributor.                                                           |
| **Husky + lint-staged**                     | ✅ Adopted  | Pre-commit hooks enforce quality gates. No unlinted code enters the repo.                                                                            |
| **Quench**                                  | ✅ Adopted  | In-Foundry testing module powered by Mocha + Chai. Tests run with real Foundry API access - essential for testing sheets, rolls, and Active Effects. |
| **Vitest/Jest**                             | ❌ Deferred | Most system logic requires Foundry context. Pure unit tests have limited value here. May add later for formula calculations.                         |
| **TypeScript**                              | ❌ Deferred | Adds complexity for a solo/small team project. JSDoc comments provide type hints without build step overhead. May migrate later.                     |
| **Rollup/Vite**                             | ❌ Deferred | Foundry v13 has excellent ESM support. No bundling needed for our use case. SCSS compilation via sass CLI is sufficient.                             |

### Alternatives Considered

**Testing:**

- **Vitest with foundry-test-utils**: Provides mocked Foundry environment (~600 lines of mocks). Rejected because mocks drift from real API, and Quench gives us actual Foundry context.
- **Cypress/Playwright**: E2E browser testing. Overkill for a game system; Quench is purpose-built for Foundry.

**Linting:**

- **Biome**: Faster than ESLint+Prettier combined. Rejected because no Foundry-specific config exists yet.
- **Standard JS**: Zero-config linting. Rejected because we need Foundry global awareness.

**Build:**

- **Gulp**: Used by SR5-FoundryVTT. Rejected as unnecessary complexity; npm scripts + sass CLI suffice.
- **TyphonJS Svelte/Vite**: Modern but opinionated toward Svelte. We're using vanilla Handlebars.

---

## Setup

### Prerequisites

- Node.js 18+ (v20 has known issues with some Foundry tooling)
- Docker & Docker Compose
- Git

### Initial Setup

```bash
# Clone repository
git clone git@github.com:calcorum/vagabond-rpg-foundryvtt.git
cd vagabond-rpg-foundryvtt

# Install dependencies
npm install

# Copy environment file and add your Foundry credentials
cp .env.example .env
# Edit .env with your FOUNDRY_USERNAME, FOUNDRY_PASSWORD, FOUNDRY_LICENSE_KEY

# Start local Foundry instance
docker compose up -d

# Start SCSS watcher (in separate terminal)
npm run watch

# Access Foundry at http://localhost:30000
```

### Available Scripts

| Command                | Description                                 |
| ---------------------- | ------------------------------------------- |
| `npm run build`        | Compile SCSS to CSS (production)            |
| `npm run watch`        | Watch SCSS and recompile on changes         |
| `npm run lint`         | Run ESLint on all JavaScript                |
| `npm run lint:fix`     | Auto-fix ESLint issues where possible       |
| `npm run format`       | Run Prettier on all files                   |
| `npm run format:check` | Check if files are formatted (CI)           |
| `npm test`             | Run Quench tests (requires running Foundry) |

---

## Code Style

### ESLint Rules

We use a Foundry-aware ESLint configuration that:

1. **Knows Foundry globals**: `game`, `CONFIG`, `canvas`, `ui`, `Hooks`, `Actor`, `Item`, etc. are recognized
2. **Prevents shadowing**: You can't accidentally create a local `game` variable
3. **Enforces ES2022+**: Modern JavaScript features encouraged
4. **Warns on common mistakes**: Unused variables, undefined references, etc.

### Prettier Configuration

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": false,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

**Why these choices:**

- `printWidth: 100` - Balances readability with modern wide screens
- `semi: true` - Explicit semicolons prevent ASI edge cases
- `singleQuote: false` - Matches Foundry core style
- `trailingComma: "es5"` - Cleaner diffs, valid ES5+

### Pre-commit Hooks

Husky runs on every commit:

1. **lint-staged**: Runs ESLint and Prettier only on staged files
2. **Blocks commits** if linting fails or files aren't formatted

To bypass (use sparingly):

```bash
git commit --no-verify -m "emergency fix"
```

---

## Testing Strategy

### Quench Integration Tests

[Quench](https://github.com/Ethaks/FVTT-Quench) runs tests inside Foundry with full API access.

**What to test:**

- ✅ Data model validation (Actor/Item creation)
- ✅ Derived value calculations (HP, Speed, difficulties)
- ✅ Roll formula generation
- ✅ Active Effect application
- ✅ Sheet rendering (no JS errors)
- ✅ Compendium item import

**What NOT to test:**

- ❌ Foundry core functionality
- ❌ Third-party module interactions
- ❌ UI pixel-perfect rendering

### Test File Location

```
module/
├── tests/
│   ├── quench-init.mjs      # Registers test batches with Quench
│   ├── actor.test.mjs       # Actor data model tests
│   ├── item.test.mjs        # Item data model tests
│   ├── rolls.test.mjs       # Dice roll tests
│   └── effects.test.mjs     # Active Effects tests
```

### Writing Tests

```javascript
// module/tests/actor.test.mjs
export function registerActorTests(quench) {
  quench.registerBatch(
    "vagabond.actors",
    (context) => {
      const { describe, it, expect } = context;

      describe("Character Actor", () => {
        it("calculates HP as Might × Level", async () => {
          const actor = await Actor.create({
            name: "Test Character",
            type: "character",
            system: { stats: { might: { value: 5 } }, level: 3 },
          });

          expect(actor.system.resources.hp.max).to.equal(15);
          await actor.delete();
        });
      });
    },
    { displayName: "Vagabond: Actor Tests" }
  );
}
```

### Running Tests

1. Install the Quench module in Foundry (Module Management)
2. Enable Quench in your world
3. Click the flask icon in the scene controls
4. Select "Vagabond" test batches
5. Click "Run"

Or via macro:

```javascript
quench.runBatches("vagabond.*");
```

---

## Project Structure

```
vagabond-rpg-foundryvtt/
├── .husky/                 # Git hooks
├── module/                 # JavaScript source
│   ├── vagabond.mjs       # System entry point
│   ├── data/              # Data models (TypeDataModel classes)
│   ├── documents/         # Document classes (VagabondActor, VagabondItem)
│   ├── sheets/            # Sheet classes
│   ├── helpers/           # Utility functions
│   ├── dice/              # Roll handling
│   └── tests/             # Quench test files
├── templates/             # Handlebars templates
├── styles/                # SCSS source and compiled CSS
├── lang/                  # Localization
├── packs/                 # Compendium data
├── assets/                # Images and icons
├── system.json            # Foundry manifest
├── .eslintrc.json         # ESLint configuration
├── .prettierrc            # Prettier configuration
└── package.json           # npm dependencies and scripts
```

---

## Continuous Integration

### GitHub Actions (Future)

When we set up CI, it will:

1. **On Pull Request:**
   - Run `npm run lint`
   - Run `npm run format:check`
   - Verify SCSS compiles without errors

2. **On Release Tag:**
   - Build production CSS
   - Create release zip
   - Publish to GitHub Releases

---

## Contributing

### Commit Message Format

```
<type>: <short description>

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code change that neither fixes nor adds
- `test`: Adding tests
- `chore`: Build/tooling changes

**Examples:**

```
feat: Add spell casting dialog with mana calculator

fix: Correct HP calculation for characters with Tough perk

docs: Update README with installation instructions
```

### Branch Naming

- `feature/spell-casting-dialog`
- `fix/hp-calculation`
- `docs/readme-update`

---

## Architecture Decisions

### Roll Dialog System (Phase 2.5+)

**Decision Date:** 2024-12-13

| Decision              | Choice                              | Rationale                                                                            |
| --------------------- | ----------------------------------- | ------------------------------------------------------------------------------------ |
| Application API       | **ApplicationV2**                   | Modern Foundry v13 API, forward-compatible, cleaner lifecycle                        |
| Dialog Behavior       | **Hybrid**                          | Normal click = dialog, Shift+click = quick roll with defaults                        |
| Favor/Hinder          | **Manual toggles + Active Effects** | GM announces situational favor/hinder; persistent sources use flags                  |
| Situational Modifiers | **Preset buttons + custom input**   | Buttons: -5, -1, +1, +5; plus free-form input field                                  |
| Dialog Structure      | **Base class + subclasses**         | `VagabondRollDialog` base → `SkillCheckDialog`, `AttackRollDialog`, `SaveRollDialog` |
| Chat Output           | **Custom templates**                | Rich chat cards with skill name, difficulty, success/fail, crit indicators           |

### Favor/Hinder via Active Effects

Persistent favor/hinder from class features, perks, or conditions uses Foundry flags set by Active Effects:

```javascript
// Active Effect change for a perk granting Favor on Performance checks:
{ key: "flags.vagabond.favor.skills.performance", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: true }

// Active Effect change for Hinder on all attack rolls:
{ key: "flags.vagabond.hinder.attacks", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: true }

// Active Effect change for Favor on Reflex saves:
{ key: "flags.vagabond.favor.saves.reflex", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: true }
```

**Flag Convention:**

- `flags.vagabond.favor.skills.<skillId>` - Favor on specific skill checks
- `flags.vagabond.hinder.skills.<skillId>` - Hinder on specific skill checks
- `flags.vagabond.favor.attacks` - Favor on all attack rolls
- `flags.vagabond.hinder.attacks` - Hinder on all attack rolls
- `flags.vagabond.favor.saves.<saveType>` - Favor on specific save type
- `flags.vagabond.hinder.saves.<saveType>` - Hinder on specific save type

The roll dialog checks these flags and displays any automatic favor/hinder, while still allowing manual override for situational modifiers announced by the GM.

### File Structure for Dialogs

```
module/applications/
├── _module.mjs              # Export barrel
├── base-roll-dialog.mjs     # VagabondRollDialog (ApplicationV2 base)
├── skill-check-dialog.mjs   # SkillCheckDialog extends VagabondRollDialog
├── attack-roll-dialog.mjs   # AttackRollDialog (Phase 2.6)
└── save-roll-dialog.mjs     # SaveRollDialog (Phase 2.7)

templates/dialog/
├── roll-dialog-base.hbs     # Shared dialog structure
└── skill-check.hbs          # Skill-specific content

templates/chat/
└── skill-roll.hbs           # Skill check result card
```

---

## Resources

- [Foundry VTT API Documentation](https://foundryvtt.com/api/)
- [Foundry Community Wiki](https://foundryvtt.wiki/)
- [Quench Testing Module](https://github.com/Ethaks/FVTT-Quench)
- [TyphonJS ESLint Config](https://github.com/typhonjs-fvtt/eslint-config-foundry.js)
- [Vagabond RPG Rules (NoteDiscovery)](https://notes.manticorum.com) - gaming/vagabond-rpg/
