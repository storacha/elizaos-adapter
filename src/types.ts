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
    /**
     * The delegation that authorizes the Agent to upload data to the Storacha network.
     * This is the base64 encoded delegation string.
     * You can install and sign up for a Storacha account using the CLI https://docs.storacha.network/w3cli
     * And then create a delegation for your agent: 
     * - https://docs.storacha.network/concepts/ucan/#delegate-across-apps-and-services
     * - https://github.com/storacha/upload-service/blob/main/packages/cli/README.md#storacha-delegation-create-audience-did
     */
    delegation: string;
    /**
     * The private key of the Storacha agent that is used to sign the data before uploading to the Storacha network.
     * You can install and sign up for a Storacha account using the CLI https://docs.storacha.network/w3cli
     * And then create a private key for your agent:
     * - https://github.com/storacha/upload-service/blob/main/packages/cli/README.md#storacha-agent-create-private-key
     */
    storachaAgentPrivateKey: string;
    /**
     * The gateway to use for fetching data from the network.
     * By default, it uses the Storacha public gateway: https://w3s.link, but you can use any trustless gateway you 
     */
    gateway: string;
    /**
     * The CID of the root index for sharing history.
     * If you want to share history across multiple agents, you can use the same root index CID.
     */
    rootIndexCID?: string; // CID of the root index for sharing history
}
