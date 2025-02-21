# Storacha Database Adapter for ElizaOS

This project implements a database adapter for [ElizaOS](https://elizaos.github.io/eliza/), enabling decentralized storage of agent data using the Storacha network.

## Overview

- **Storacha**: A decentralized storage network built on IPFS and w3up, providing secure and efficient data storage with content addressing.
- **ElizaOS**: An AI agent operating system for building, deploying, and managing intelligent agents. [Learn more](https://elizaos.github.io/eliza/).

## Prerequisites

Ensure you have the following before getting started:

- Node.js 22+
- pnpm 9+
- Git for version control
- A code editor (VS Code recommended)
- Storacha delegation token ([Learn how to create one](https://docs.storacha.network/concepts/ucan/#delegate-across-apps-and-services))

## Quick Start

### Install Eliza Starter Kit + Database Adapter

1. **Create a New Repository**: Use the Storacha Eliza Starter Kit template, which includes the database adapter:
   - [Create new repo](https://github.com/new?template_name=eliza-starter&template_owner=storacha)

### Configure Environment Variables

1. **Copy the Example Environment File**:
   ```bash
   cp .env.example .env
   ```

2. **Generate the `STORACHA_AGENT_PRIVATE_KEY`**:
   ```bash
   w3 key create
   ```
   - Copy the private key (e.g., `MgCYJE...Ig3Kk=`) and add it to `STORACHA_AGENT_PRIVATE_KEY`.
   - Copy the Agent DID key (e.g., `did:key:...`) to create the Agent Delegation.

3. **Generate the `STORACHA_AGENT_DELEGATION`**:
   - Replace `AGENT_DID_KEY` with your DID Key and execute:
   ```bash
   w3 delegation create AGENT_DID_KEY --can 'store/add' --can 'filecoin/offer' --can 'upload/add' --can 'space/blob/add' --can 'space/index/add' | base64
   ```
   - Copy the base64 encoded content and add it to `STORACHA_AGENT_DELEGATION`.

### Set Up the Database Adapter

Steps required only if you are starting with a fresh version of the main [Eliza Starter Kit](https://github.com/storacha/eliza-starter).

1. **Install the Database Adapter**:
   ```bash
   pnpm add @storacha/elizaos-adapter
   ```

2. **Update the Database Configuration**:
   Modify the [database configuration](https://github.com/elizaOS/eliza-starter/blob/main/src/database/index.ts#L7) to load the Database Adapter:
   ```typescript
   if (process.env.STORACHA_AGENT_DELEGATION && process.env.STORACHA_AGENT_PRIVATE_KEY) {
       const db = new StorachaDatabaseAdapter({
         agentPrivateKey: process.env.STORACHA_AGENT_PRIVATE_KEY,
         delegation: process.env.STORACHA_AGENT_DELEGATION,    
       });
       return db;
     } else if ...
   ```

3. **Integrate the Database Adapter into the Agent Runtime**:
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

This project is licensed under the MIT & Apache-2.0 licenses.