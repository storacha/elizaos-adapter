# @storacha/elizaos-adapter

This project implements a database adapter for [ElizaOS](https://elizaos.github.io/eliza/) that enables decentralized storage of agent data using the Storacha network. Which facilitates data sharing and data redundancy - all data is persisted in Filecoin L1.

## Overview

- **Storacha**: A decentralized storage network built on IPFS and w3up, providing secure and efficient data storage with content addressing.
- **ElizaOS**: An AI agent operating system that enables building, deploying and managing intelligent agents. [website](https://elizaos.github.io/eliza/)

## Prerequisites

Before getting started, ensure you have:
- Node.js 22+
- pnpm 9+
- Git for version control
- A code editor (VS Code recommended)
- Storacha delegation token - (learn how to create one at [storacha.network](https://docs.storacha.network/concepts/ucan/#delegate-across-apps-and-services))

## Quick Start

### Install ElizaOS

1. Click to create a new repository based on Eliza Starter Kit template

- https://github.com/new?template_name=eliza-starter&template_owner=elizaOS

or checkout the [latest version](https://github.com/elizaOS/eliza-starter/tree/main).

### Set up the Database Adapter

1. Install the Database Adapter:
```bash
pnpm add @storacha/elizaos-adapter
```

2. Update the [database configuration](https://github.com/elizaOS/eliza-starter/blob/main/src/database/index.ts#L7) to load the Database Adapter:

```typescript
if (process.env.STORACHA_AGENT_DELEGATION && process.env.STORACHA_AGENT_PRIVATE_KEY) {
    const db = new StorachaDatabaseAdapter({
      agentPrivateKey: process.env.STORACHA_AGENT_PRIVATE_KEY,
      delegation: process.env.STORACHA_AGENT_DELEGATION,    
    });
    return db;
  } else if ...
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
```diff
--- a/agent/src/index.ts
+++ b/agent/src/index.ts
@@ -7,6 +7,7 @@ import { LensAgentClient } from "@elizaos/client-lens";
 import { SlackClientInterface } from "@elizaos/client-slack";
 import { TelegramClientInterface } from "@elizaos/client-telegram";
 import { TwitterClientInterface } from "@elizaos/client-twitter";
+import { DatabaseAdapter } from "@storacha/elizaos-adapter";
 import {
     AgentRuntime,
     CacheManager,
@@ -677,8 +678,12 @@ async function startAgent(
             fs.mkdirSync(dataDir, { recursive: true });
         }
 
-        db = initializeDatabase(dataDir) as IDatabaseAdapter &
-            IDatabaseCacheAdapter;
+        db = new DatabaseAdapter({
+            agentPrivateKey: process.env.STORACHA_AGENT_PRIVATE_KEY,
+            delegation: process.env.STORACHA_AGENT_DELEGATION,
+        });
 
         await db.init();
```

### Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```
2. Generate the `STORACHA_AGENT_PRIVATE_KEY`:
```bash
w3 key create
```
- Copy the PK `MgCYJE...Ig3Kk=` and add it to the `STORACHA_AGENT_PRIVATE_KEY`.
- Copy the Agent DID key: `did:key:...` to create the Agent Delegation.

3. Generate the `STORACHA_AGENT_DELEGATION`:
- Replace the `AGENT_DID_KEY` with the DID Key you copied in the previous step, and then execute the command:
```bash
w3 delegation create AGENT_DID_KEY --can 'store/add' --can 'filecoin/offer' --can 'upload/add' --can 'space/blob/add' --can 'space/index/add' | base64
```
- Copy the base64 encoded content, and add to the `STORACHA_AGENT_DELEGATION` environment variable.


## Roadmap & Features

- [x] Create Memory Storage Adapter for ElizaOS
- [x] Integrate with Storacha Client Using Existing Delegation
- [x] Data redundancy - all data is stored in Filecoin L1
- [x] Make It Work with ElizaOS and ElizaStarter
- [x] Provide Developer Documentation
- [ ] Add GitHub SSO Onboarding and Free-Tier Storage via Stripe
- [ ] Implement Agent Data Sharing Mechanisms
- [ ] Add Encrypted Agent Storage with Lit Protocol
- [ ] Handle Mutability for Stored Data

## License

MIT & Apache-2.0
