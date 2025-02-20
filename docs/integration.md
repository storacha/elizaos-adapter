### Research Notes & Implementation Notes

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
import { StorachaDatabaseAdapter } from '@storacha/elizaos-adapter';
import * as dotenv from 'dotenv';

dotenv.config();

const myAgentId = 'my-agent';

// 1. Set up long-term storage
const adapter = new StorachaDatabaseAdapter({
    delegation: process.env.STORACHA_DELEGATION,
    storachaAgentPrivateKey: process.env.STORACHA_AGENT_PRIVATE_KEY
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
if (process.env.STORACHA_DELEGATION && process.env.STORACHA_AGENT_PRIVATE_KEY) {
    const db = new StorachaDatabaseAdapter({
      delegation: process.env.STORACHA_DELEGATION,
      storachaAgentPrivateKey: process.env.STORACHA_AGENT_PRIVATE_KEY
    });
    return db;
  } else if ...
```

#### Key Features of the Storacha Adapter
1. **Decentralized Storage**: Uses IPFS/Storacha for permanent content storage
2. **Immutable History**: All content is content-addressed and immutable
3. **Sharing**: Easy sharing between agents via root index CID
4. **Chronological Ordering**: Maintains sequence numbers for strict ordering

#### Storage Architecture in Storacha Adapter

1. **Root Index**
   - Maps collection names to their latest CIDs
   - Structure:
   ```typescript
   interface RootIndex {
       collections: {
           [name: string]: {
               cid: string;
               lastUpdated: Date;
           }
       }
   }
   ```

2. **Collection Indexes**
   - Tracks all items in a collection with their metadata
   - Structure:
   ```typescript
   interface CollectionIndex<T> {
       items: IndexEntry[];
       lastUpdated: Date;
       lastSequence?: number;
       rootCid?: string;
   }

   interface IndexEntry {
       id: UUID;
       cid: string;
       filename: string;
       roomId?: UUID;
       tableName?: string;
       agentId?: UUID;
       created: Date;
       updated: Date;
       sequence?: number;
       previousCid?: string;
   }

   interface MemoryIndex extends CollectionIndex<Memory> {
       embeddings?: {
           id: UUID;
           vector: number[];
       }[];
   }
   ```

Memory Operations:

1. **Creating Memories**
```typescript
async createMemory(memory: Memory, tableName: string): Promise<void> {
    const filename = `${memory.id}.json`;
    const memoryData = JSON.stringify(memory);
    const memoryFile = new File([memoryData], filename);
    const cid = await this.storachaClient.uploadDirectory([memoryFile]);
    
    // Update index with new memory
    const index = await this.getIndex<MemoryIndex>(`memories-${tableName}`);
    index.items.push({
        id: memory.id,
        cid: cid.toString(),
        filename,
        roomId: memory.roomId,
        tableName,
        created: new Date(),
        updated: new Date()
    });

    // Store embedding if present
    if (memory.embedding) {
        index.embeddings = index.embeddings || [];
        index.embeddings.push({
            id: memory.id,
            vector: memory.embedding
        });
    }

    await this.updateIndex(`memories-${tableName}`, index);
}
```

2. **Retrieving Memories**
```typescript
async getMemories(params: {
    roomId: UUID;
    count?: number;
    tableName: string;
    agentId: UUID;
}): Promise<Memory[]> {
    const index = await this.getIndex<MemoryIndex>(`memories-${params.tableName}`);
    const filteredItems = index.items.filter(item =>
        item.roomId === params.roomId &&
        item.agentId === params.agentId
    );

    return Promise.all(
        filteredItems.slice(0, params.count).map(item => 
            this.fetchFromGateway(item.cid, item.filename)
        )
    );
}
```

3. **Searching Memories**
```typescript
async searchMemories(params: {
    tableName: string;
    agentId: UUID;
    roomId: UUID;
    embedding: number[];
    match_threshold: number;
    match_count: number;
}): Promise<Memory[]> {
    const index = await this.getIndex<MemoryIndex>(`memories-${params.tableName}`);
    
    // Perform cosine similarity search
    const similarities = index.embeddings.map(item => ({
        id: item.id,
        similarity: this.cosineSimilarity(params.embedding, item.vector)
    }));

    const matches = similarities
        .filter(item => item.similarity >= params.match_threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, params.match_count);

    // Fetch matched memories
    const matchedItems = index.items.filter(item =>
        matches.some(match => match.id === item.id)
    );

    return Promise.all(
        matchedItems.map(item => 
            this.fetchFromGateway(item.cid, item.filename)
        )
    );
}
```

4. **Removing Memories**
```typescript
async removeMemory(memoryId: UUID, tableName: string): Promise<void> {
    const index = await this.getIndex<MemoryIndex>(`memories-${tableName}`);
    const item = index.items.find(i => i.id === memoryId);

    if (item) {
        // Remove from index
        index.items = index.items.filter(i => i.id !== memoryId);
        
        // Remove from embeddings
        if (index.embeddings) {
            index.embeddings = index.embeddings.filter(e => e.id !== memoryId);
        }

        // Update index
        await this.updateIndex(`memories-${tableName}`, index);
        
        // Remove from Storacha hot storage (but content remains on IPFS)
        await this.storachaClient.remove(item.cid);
    }
}
```

#### Sharing Between Agents
```typescript
// Agent A creates and populates storage
const agentA = new Agent({
    databaseAdapter: new StorachaAdapter({
        delegation: process.env.AGENT_A_DELEGATION,
        storachaAgentPrivateKey: process.env.AGENT_A_PRIVATE_KEY,
        gateway: 'https://w3s.link/ipfs',
        agentId: 'agent-a'
    })
});

// Get root index CID after storing data
const rootIndexCID = await agentA.databaseAdapter.getRootIndexCID();

// Agent B can access Agent A's data using the root index CID
const agentB = new Agent({
    databaseAdapter: new StorachaAdapter({
        delegation: process.env.AGENT_B_DELEGATION,
        storachaAgentPrivateKey: process.env.AGENT_B_PRIVATE_KEY,
        gateway: 'https://w3s.link/ipfs',
        agentId: 'agent-b',
        rootIndexCID // Share history by providing the CID
    })
});
```
