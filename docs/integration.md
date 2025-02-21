#### Goal

Integrate Storacha storage into ElizaOS framework.

#### ElizaOS is a framework for building intelligent agents that can

1. **Core Capabilities**
   - Maintain conversations with users
   - Store and retrieve memories with vector embeddings
   - Manage goals and tasks
   - Learn from interactions
   - Share knowledge between agents using IPFS/Storacha

2. **Architecture**
   - **Database Adapters**: For short or long-term persistent storage
   - **Plugins**: For extending functionality
   - **Core Engine**: Manages agent behavior and processing
   - **Memory Management**: Handles both short and long-term memory with vector search

#### How to use ElizaOS with Storacha

```typescript
import { Agent } from '@elizaos/core';
import { DatabaseAdapter } from '@storacha/elizaos-adapter';
import * as dotenv from 'dotenv';

dotenv.config();

const myAgentId = 'my-agent';

// 1. Set up long-term storage
const adapter = new DatabaseAdapter({
    agentPrivateKey: process.env.STORACHA_AGENT_PRIVATE_KEY,
    delegation: process.env.STORACHA_AGENT_DELEGATION,
});

// Initialize the adapter
await adapter.init();

// 2. Create the agent
const agent = new Agent({
    id: myAgentId,
    name: 'Test Agent',
    databaseAdapter: adapter,
    config: {
        personality: 'helpful and friendly',
        capabilities: ['chat', 'memory-management']
    }
});

// 3. Initialize the agent
await agent.init();

// Store a memory with embedding
await agent.databaseAdapter.createMemory({
    id: 'memory-1',
    roomId: 'room-1',
    agentId: myAgentId,
    content: { text: 'Hello, world!' },
    embedding: new Array(128).fill(0.1), // Vector embedding for semantic search
    created: new Date(),
    updated: new Date()
}, 'conversations');

// Retrieve memories
const memories = await agent.databaseAdapter.getMemories({
    roomId: 'room-1',
    tableName: 'conversations',
    agentId: myAgentId,
    count: 10
});

// Search memories by vector similarity
const searchResults = await agent.databaseAdapter.searchMemories({
    tableName: 'conversations',
    agentId: myAgentId,
    roomId: 'room-1',
    embedding: new Array(128).fill(0.1),
    match_threshold: 0.8,
    match_count: 10,
    unique: true
});
```

#### How to use Eliza Starter with Storacha

1. Checkout the latest version of the [Eliza Starter](https://github.com/elizaOS/eliza-starter/tree/main).

2. Install the Storacha Database Adapter:
```bash
pnpm add @storacha/elizaos-adapter
```

3. Update the [database configuration](https://github.com/elizaOS/eliza-starter/blob/main/src/database/index.ts#L7) to load the Storacha Adapter:

```typescript
if (process.env.STORACHA_AGENT_DELEGATION && process.env.STORACHA_AGENT_PRIVATE_KEY) {
    const db = new StorachaDatabaseAdapter({
        agentPrivateKey: process.env.STORACHA_AGENT_PRIVATE_KEY,
      delegation: process.env.STORACHA_AGENT_DELEGATION,
    });
    return db;
  } else if ...
```

#### Key Features of the Storacha Adapter
1. **Decentralized Storage**: Uses IPFS/Storacha for permanent content storage
2. **Data Redundancy**: All data is persisted in Filecoin L1
3. **Immutable History**: All content is content-addressed and immutable
4. **Sharing**: Easy sharing between agents via root index CID
5. **Chronological Ordering**: Maintains sequence numbers for strict ordering


#### Sharing Data Between Agents
```typescript
const agentAId = 'agent-a'
// Agent A creates and populates storage
const agentA = new Agent({
    id: agentAId,
    databaseAdapter: new StorachaAdapter({
        agentPrivateKey: process.env.STORACHA_AGENT_A_PRIVATE_KEY,
        delegation: process.env.STORACHA_AGENT_A_DELEGATION,
    })
});

await agentA.databaseAdapter.createMemory({
    id: 'memory-1',
    roomId: 'room-1',
    agentId: agentAId,
    content: { text: 'Hello, world!' },
    embedding: new Array(128).fill(0.1), // Vector embedding for semantic search
    created: new Date(),
    updated: new Date()
}, 'conversations');

// Get root index CID after storing data
const rootIndexCID = await agentA.databaseAdapter.getRootIndexCID();

// Agent B can access Agent A's data using the root index CID
const agentB = new Agent({
    id: 'agent-b',
    databaseAdapter: new StorachaAdapter({
        // Share the root index of agent A with agent B by providing the Root Index CID
        rootIndexCID,
        agentPrivateKey: process.env.STORACHA_AGENT_B_PRIVATE_KEY,
        delegation: process.env.STORACHA_AGENT_B_DELEGATION,
    })
});
```
