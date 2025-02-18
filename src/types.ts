import { type UUID,type Memory } from "@elizaos/core";

/**
 * Basic index entry for storing items
 */
export interface IndexEntry {
    id: UUID | undefined;
    cid: string;
    filename: string;
    roomId?: UUID;
    tableName?: string;
    agentId?: UUID;
    created: Date;
    updated: Date;
    sequence?: number; // For strict ordering within a collection
    previousCid?: string; // Link to previous entry for chain verification
}

/**
 * Generic collection index
 */
export interface CollectionIndex<T> {
    items: IndexEntry[];
    lastUpdated: Date;
    lastSequence?: number; // Track the last used sequence number
    rootCid?: string; // First CID in the collection for chain verification
}

/**
 * Memory-specific index that includes embeddings
 */
export interface MemoryIndex extends CollectionIndex<Memory> {
    embeddings?: {
        id: UUID | undefined;
        vector: number[];
    }[];
}

/**
 * Root index mapping collection names to their CIDs
 */
export interface RootIndex {
    collections: {
        [name: string]: {
            cid: string;
            lastUpdated: Date;
        }
    }
}

export interface StorachaConfig {
    delegation: string;
    storachaAgentPrivateKey: string;
    gateway: string;
    agentId: UUID; // Current agent's identifier
    rootIndexCID?: string; // CID of the root index for sharing history
}
