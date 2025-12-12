# Vagabond RPG - Foundry VTT System

A complete Foundry VTT v13 system implementation for **Vagabond RPG** - Pulp Fantasy Roleplaying.

## Features

- Full character sheet matching the official Hero Record design
- Dynamic spell casting system with delivery/duration/damage customization
- Automated skill checks with favor/hinder modifiers
- Variable crit thresholds per skill (modified by class features and perks)
- Complete compendiums: 18 classes, 55+ spells, 90+ perks, ancestries, equipment, bestiary
- NPC/Monster stat blocks with morale system
- Parchment-themed UI with accessibility (color-blind friendly)

## Installation

### From Foundry
1. Open Foundry VTT Setup
2. Navigate to Game Systems
3. Click "Install System"
4. Search for "Vagabond" or paste the manifest URL:
   ```
   https://github.com/calcorum/vagabond-rpg-foundryvtt/releases/latest/download/system.json
   ```

### Manual Installation
1. Download the latest release from GitHub
2. Extract to `Data/systems/vagabond/`
3. Restart Foundry VTT

## Development Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (for local Foundry instance)

### Quick Start
```bash
# Clone the repository
git clone https://github.com/calcorum/vagabond-rpg-foundryvtt.git
cd vagabond-rpg-foundryvtt

# Install dependencies
npm install

# Start SCSS watcher
npm run watch

# Start local Foundry instance
docker compose up -d

# Access Foundry at http://localhost:30000
```

### Project Structure
```
vagabond-rpg-foundryvtt/
├── module/                 # JavaScript modules
│   ├── vagabond.mjs       # System entry point
│   ├── documents/         # Actor/Item document classes
│   ├── sheets/            # Sheet classes
│   ├── helpers/           # Utility functions
│   └── dice/              # Roll handling
├── templates/             # Handlebars templates
│   ├── actor/             # Actor sheet templates
│   ├── item/              # Item sheet templates
│   ├── chat/              # Chat message templates
│   └── dialog/            # Roll dialog templates
├── styles/                # SCSS/CSS
│   └── scss/              # SCSS source files
├── lang/                  # Localization files
├── packs/                 # Compendium data
├── assets/                # Images and icons
├── system.json            # System manifest
└── docker-compose.yml     # Local dev environment
```

### Building Styles
```bash
# One-time build
npm run build

# Watch for changes
npm run watch
```

### Creating a Release
```bash
npm run release
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

Vagabond RPG is a product of its respective copyright holders. This system implementation is a fan project and is not affiliated with or endorsed by the original game creators.

## Acknowledgments

- Vagabond RPG by [Publisher] for the amazing game system
- Foundry VTT community for documentation and examples
- All contributors to this project
