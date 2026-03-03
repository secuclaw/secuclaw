---
summary: "Install SecuClaw on your system with various deployment options."
read_when:
  - Setting up SecuClaw for the first time
  - Choosing an installation method
title: "Installation"
---

# Installation

SecuClaw supports multiple installation methods. Choose the one that best fits your environment.

## Prerequisites

- **Node.js**: Version 22 or higher
- **Package Manager**: npm, pnpm, or bun
- **API Key**: Anthropic API key (recommended) or other LLM providers

## Quick Install

```bash
# Using npm
npm install -g secuclaw@latest

# Using pnpm
pnpm add -g secuclaw

# Using bun
bun add -g secuclaw
```

## Verify Installation

```bash
secuclaw --version
secuclaw --help
```

## Installation Methods

<Tabs>
  <Tab title="Docker (Recommended)">
    Docker provides the easiest way to get started with full isolation.

    ```bash
    # Pull the latest image
    docker pull secuclaw/secuclaw:latest

    # Run the container
    docker run -d \
      --name secuclaw \
      -p 21000:21000 \
      -v ~/.secuclaw:/root/.secuclaw \
      secuclaw/secuclaw:latest
    ```


  </Tab>
  <Tab title="Node.js">
    Install directly via Node.js package manager.

    ```bash
    npm install -g secuclaw@latest
    ```


  </Tab>
  <Tab title="Binary">
    Download pre-built binaries for your platform.

    ```bash
    # macOS
    curl -L https://github.com/secuclaw/secuclaw/releases/latest/download/secuclaw-darwin-arm64.tar.gz | tar xz
    ./secuclaw --version

    # Linux
    curl -L https://github.com/secuclaw/secuclaw/releases/latest/download/secuclaw-linux-amd64.tar.gz | tar xz
    ./secuclaw --version
    ```


  </Tab>
  <Tab title="Source">
    Build from source for development.

    ```bash
    git clone https://github.com/secuclaw/secuclaw.git
    cd secuclaw
    pnpm install
    pnpm build
    ```


  </Tab>
</Tabs>

## Cloud Platforms

<Tabs>
  <Tab title="Render">
    Deploy to Render with one click.

    ```bash
    # Using Render YAML
    services:
      - type: web
        name: secuclaw
        env: docker
        dockerfilePath: Dockerfile
        dockerCommand: secuclaw gateway
    ```


  </Tab>
  <Tab title="Railway">
    Deploy to Railway.


  </Tab>
  <Tab title="Fly.io">
    Deploy to Fly.io edge servers.


  </Tab>
  <Tab title="Hetzner">
    Deploy to Hetzner Cloud.


  </Tab>
</Tabs>

## Post-Installation

After installation, run the initialization wizard:

```bash
secuclaw init
secuclaw configure
```

See [Getting Started](/start/getting-started) for the next steps.

## Updating

```bash
# Update CLI
secuclaw update

# Or reinstall
npm install -g secuclaw@latest
```



## Uninstalling

```bash
# Remove CLI
npm uninstall -g secuclaw

# Remove data
rm -rf ~/.secuclaw
```



---

_Related: [Getting Started](/start/getting-started)_
