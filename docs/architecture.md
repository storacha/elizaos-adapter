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