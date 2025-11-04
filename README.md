<div align="center">
  <img src="public/icons/icon.png" alt="ZickZackClient" width="120" />

  # ZickZackClient

  _Neon-dark launcher for the ZickZack Minecraft experience_
</div>

ZickZackClient is a cross-platform desktop launcher built with React, Tauri, and Rust. It provides an opinionated setup for Minecraft with a neon dark-green aesthetic, profile management, automatic updates, and an optional FPS Booster that tunes both the launcher and the game for low-latency play.

## Features

- **Minecraft Profile Management** – Configure game versions, mod packs, and launch arguments per profile.
- **Integrated Updates** – Handle client and resource updates directly inside the launcher UI.
- **Neon Dark Theme** – Global styling built around the ZickZack color palette with adaptive visual effects.
- **FPS Booster** – Toggle a launcher-wide performance profile that also applies optimized Minecraft `options.txt` and JVM flags before launch.
- **Cross-Platform Builds** – Uses Tauri to produce lightweight binaries for Windows, macOS, and Linux.

## Getting Started

### Prerequisites

You will need the following tools installed:

- [Node.js](https://nodejs.org/en/download) **v18 or newer** (includes npm)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable toolchain)
- [Yarn](https://yarnpkg.com/getting-started/install) package manager (`npm install -g yarn` if you prefer the classic installer)

### Installation

Clone the repository and install dependencies:

```bash
git clone --recurse-submodules https://github.com/NoRiskClient/noriskclient-launcher zickzack-client
cd zickzack-client
yarn install
```

Or run one of the bundled helper scripts to install dependencies and produce a release build in a single step:

- **Linux:** `./scripts/install-linux.sh [options]`
- **Windows:** `pwsh -ExecutionPolicy Bypass ./scripts/install-windows.ps1 [options]`

Use the `--help`/`-Help` flag to see all capabilities. Highlights include logging to a file, non-interactive CI output, choosing a Rust target triple, forcing debug builds, and skipping the build entirely when you only want dependencies.

### Development Workflow

- **Start the launcher in development mode**

  ```bash
  yarn tauri dev
  ```

- **Run the React frontend alone (without the Tauri shell)**

  ```bash
  yarn dev
  ```

- **Type-check and lint the project**

  ```bash
  yarn lint
  yarn typecheck
  ```

### Building Binaries

Create a production build of the launcher:

```bash
yarn tauri build
```

The compiled application bundles will be located under `src-tauri/target/release/` for your current platform. Use `yarn tauri build --target <triple>` to build for other architectures.

## Configuration

ZickZackClient stores persistent configuration in the `launcher-config.json` file. Notable settings include:

- `fps_booster_enabled` – When `true`, the launcher enforces low-impact visuals and applies additional Minecraft and JVM optimizations before launching the game.
- `profiles` – Defines the Minecraft installations available in the launcher.
- `updater` – Controls update channels, mirrors, and automatic download behavior.

You can edit configuration through the Settings tab in the UI or by modifying the JSON file while the launcher is closed.

## Troubleshooting & Support

- **Bug reports & feature requests:** [Open an issue](https://github.com/NoRiskClient/issues/issues/new/choose).
- **Common build errors:** Ensure that the Rust toolchain is installed and up to date (`rustup update`). If you encounter Node version conflicts, consider using `nvm` to switch to Node 18+.
- **Launcher logs:** Check the Tauri application logs under `%APPDATA%/zickzack-client/logs` on Windows or `~/.local/share/zickzack-client/logs` on Linux.

## Contributing

Contributions are welcome! Please fork the repository, create a branch, and submit a pull request describing your changes. When contributing code, run the lint, type check, and build commands listed above to keep the project consistent.

## License

This project inherits code from [LiquidLauncher](https://github.com/CCBlueX/LiquidLauncher) and is therefore distributed under the [GNU General Public License v3.0](LICENSE). In short:

- You may use the source code commercially or privately.
- You must disclose the source code of any derivative work that uses code from this project.
- Your derivative must also be licensed under GPLv3.

Please share improvements with the community just as we do.
