# @storacha/elizaos-storacha

Storacha implements a database adapter for [ElizaOS](https://elizaos.github.io/eliza/) that enables decentralized storage of agent data using the Storacha network.

## Overview

- **Storacha**: A decentralized storage network built on IPFS and w3up, providing secure and efficient data storage with content addressing.
- **ElizaOS**: An AI agent operating system that enables building, deploying and managing intelligent agents. [website](https://elizaos.github.io/eliza/)

## Prerequisites

Before getting started, ensure you have:
- Node.js 23+
- pnpm 9+
- Git for version control
- A code editor (VS Code recommended)
- Storacha delegation token - (learn how to create one at [storacha.network](https://docs.storacha.network/concepts/ucan/#delegate-across-apps-and-services))

## Quick Start

### Install ElizaOS

1. Clone the repository
```bash
git clone https://github.com/elizaos/eliza.git
cd eliza
```

2. Switch to latest tagged release
```bash
# This project iterates fast, so we recommend checking out the latest release
git checkout $(git describe --tags --abbrev=0)
# If the above doesn't work, try:
# git checkout $(git describe --tags `git rev-list --tags --max-count=1`)
```

3. Install dependencies
```bash
pnpm install --no-frozen-lockfile
```

4. Build ElizaOS
```bash
pnpm build
```

### Install the Storacha Database Adapter

#### Install in ElizaOS Workspace

1. Install the Storacha package
```bash
pnpm add @storacha/adapter-storacha
```

2. Add the Storacha Adapter to the agent runtime
```
--- a/agent/src/index.ts
+++ b/agent/src/index.ts
@@ -7,6 +7,7 @@ import { LensAgentClient } from "@elizaos/client-lens";
 import { SlackClientInterface } from "@elizaos/client-slack";
 import { TelegramClientInterface } from "@elizaos/client-telegram";
 import { TwitterClientInterface } from "@elizaos/client-twitter";
+import { StorachaDatabaseAdapter } from "@storacha/elizaos-adapter";
 import {
     AgentRuntime,
     CacheManager,
@@ -677,8 +678,12 @@ async function startAgent(
             fs.mkdirSync(dataDir, { recursive: true });
         }
 
-        db = initializeDatabase(dataDir) as IDatabaseAdapter &
-            IDatabaseCacheAdapter;
+        db = new StorachaDatabaseAdapter({
+            delegation: process.env.STORACHA_DELEGATION,
+            storachaAgentPrivateKey: process.env.STORACHA_AGENT_PRIVATE_KEY,
+            gateway: process.env.GATEWAY || 'https://w3s.link/ipfs',
+        });
 
         await db.init();
```

If you are using the [Eliza Starter Kit](https://github.com/elizaOS/eliza-starter) follow [these instructions](https://github.com/storacha/elizaos-adapter/blob/main/docs/integration.md#how-to-use-eliza-starter-with-storacha).
This is the current working version of the Starter Kit: https://github.com/storacha/eliza-starter

### Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Configure the required variables in your `.env`:
```env
# Required Configuration
STORACHA_DELEGATION=your-delegation-token      # Get from storacha.network
STORACHA_AGENT_PRIVATE_KEY=your-private-key    # Your agent's Ed25519 private key (w3 key create command)
```

## Roadmap & Features

- [x] Create Memory Storage Adapter for ElizaOS
- [x] Integrate with Storacha Client Using Existing Delegation
- [x] Provide Developer Documentation
- [ ] Make It Work with ElizaOS and ElizaStarter
- [ ] Add GitHub SSO Onboarding and Free-Tier Storage via Stripe
- [ ] Implement Agent Data Sharing Mechanisms
- [ ] Add Encrypted Agent Storage with Lit Protocol
- [ ] Handle Mutability for Stored Data

## License

MIT & Apache-2.0

