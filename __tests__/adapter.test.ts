import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DatabaseAdapter } from "../src";
import type { Memory, UUID } from "@elizaos/core";
import * as Storacha from '@web3-storage/w3up-client';
import { Signer } from "@ucanto/principal/ed25519";

// Mock the w3up-client
vi.mock('@web3-storage/w3up-client', () => ({
    create: vi.fn().mockImplementation(() => ({
        uploadDirectory: vi.fn().mockImplementation((files: File[]) => {
            // Mock Link object that has toString() method
            return {
                toString: () => "bafybeihkoeuql3cf7rw2wmf4rqclj6tlp2m7lqsflkyjm4xjbrlqwwqbym"
            };
        }),
        addProof: vi.fn()
    }))
}));

// Helper function to create mock responses
function createMockResponse(data: any, options: { ok: boolean; status?: number; statusText?: string } = { ok: true }) {
    const status = options.status || (options.ok ? 200 : 404);
    const statusText = options.statusText || (options.ok ? 'OK' : 'Not Found');
    return new Response(JSON.stringify(data), {
        status,
        statusText,
        headers: { 'content-type': 'application/json' }
    });
}

// Mock node-fetch
vi.mock('node-fetch', () => ({
    default: vi.fn().mockImplementation((url: string) => {
        if (url.includes('root.json')) {
            return Promise.resolve(createMockResponse({
                collections: {
                    'memories-test': {
                        cid: 'test-collection-cid',
                        lastUpdated: new Date()
                    }
                }
            }));
        }
        if (url.includes('index.json')) {
            return Promise.resolve(createMockResponse({
                items: [],
                lastUpdated: new Date()
            }));
        }
        if (url.includes('memory-123.json')) {
            return Promise.resolve(createMockResponse({
                id: "memory-123" as UUID,
                roomId: "room-123" as UUID,
                agentId: "agent-123" as UUID,
                content: { text: "Test memory" },
                created: new Date(),
                updated: new Date()
            }));
        }
        return Promise.resolve(createMockResponse(null, {
            ok: false,
            status: 404,
            statusText: 'Not Found'
        }));
    }),
    Response
}));

async function createTestAgent() {
    const principal = await Signer.generate();
    return {
        agentPrivateKey: principal.signer.verifier,
        agentDelegation: await principal.delegation()
    }
}

describe("DatabaseAdapter", () => {
    let adapter: DatabaseAdapter;

    beforeEach(() => {
        adapter = new DatabaseAdapter({
            agentDelegation: "test-delegation",
            agentPrivateKey: "test-private-key",
            gateway: "https://test.gateway.com",
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("Initialization", () => {
        it("should initialize successfully", async () => {
            await expect(adapter.init()).resolves.not.toThrow();
            expect(Storacha.create).toHaveBeenCalled();
        });

        it("should throw error if delegation is missing", async () => {
            adapter = new DatabaseAdapter({
                agentDelegation: "",
                agentPrivateKey: "test-private-key",
                gateway: "https://test.gateway.com",
            });
            await expect(adapter.init()).rejects.toThrow("Delegation is missing");
        });
    });

    describe("Memory Operations", () => {
        beforeEach(async () => {
            await adapter.init();
        });

        it("should create memory and update index", async () => {
            const memory: Memory = {
                id: "memory-123" as UUID,
                roomId: "room-123" as UUID,
                agentId: "agent-123" as UUID,
                content: { text: "Test memory" },
                createdAt: Date.now(),
                userId: "user-123" as UUID,
            };

            await expect(adapter.createMemory(memory, "test-table")).resolves.not.toThrow();
        });

        it("should retrieve memory by ID", async () => {
            const memory = await adapter.getMemoryById("memory-123" as UUID);
            expect(memory).toBeDefined();
            expect(memory?.id).toBe("memory-123");
            expect(memory?.content.text).toBe("Test memory");
        });

        it("should retrieve memories with pagination", async () => {
            const memories = await adapter.getMemories({
                roomId: "room-123" as UUID,
                tableName: "test-table",
                agentId: "agent-123" as UUID,
                count: 10
            });

            expect(Array.isArray(memories)).toBe(true);
        });

        it("should handle memory removal", async () => {
            await expect(adapter.removeMemory("memory-123" as UUID, "test-table"))
                .resolves.not.toThrow();
        });
    });

    describe("File Operations", () => {
        beforeEach(async () => {
            await adapter.init();
        });

        it("should handle file uploads correctly", async () => {
            const memory: Memory = {
                id: "memory-123" as UUID,
                roomId: "room-123" as UUID,
                agentId: "agent-123" as UUID,
                content: { text: "Test memory" },
                createdAt: Date.now(),
                userId: "user-123" as UUID,
            };

            // This will test both file creation and upload
            await adapter.createMemory(memory, "test-table");

            // Verify the upload was called with a File object
            const mockStorachaClient = await Storacha.create({});
            expect(mockStorachaClient.uploadDirectory).toHaveBeenCalled();
            const uploadCall = vi.mocked(mockStorachaClient.uploadDirectory).mock.calls[0];
            expect(uploadCall[0]).toHaveLength(1);
            expect(uploadCall[0][0]).toBeInstanceOf(File);
        });

        it("should handle file retrieval errors gracefully", async () => {
            const memory = await adapter.getMemoryById("non-existent" as UUID);
            expect(memory).toBeNull();
        });

        it("should handle gateway timeouts", async () => {
            vi.mocked(fetch).mockImplementationOnce(() =>
                Promise.reject(new Error("Gateway timeout"))
            );
            const memory = await adapter.getMemoryById("memory-123" as UUID);
            expect(memory).toBeNull();
        });

        it("should handle malformed responses", async () => {
            vi.mocked(fetch).mockImplementationOnce(() =>
                Promise.resolve(createMockResponse("invalid json", { ok: true }))
            );
            const memory = await adapter.getMemoryById("memory-123" as UUID);
            expect(memory).toBeNull();
        });
    });

    describe("Sharing Data Between Agents", () => {
        let agentAAdapter: DatabaseAdapter;
        let agentBAdapter: DatabaseAdapter;
        const sharedRootCID = "bafybeihkoeuql3cf7rw2wmf4rqclj6tlp2m7lqsflkyjm4xjbrlqwwqbym";

        beforeEach(async () => {
            // Set up Agent A (original data owner)
            agentAAdapter = new DatabaseAdapter({
                agentDelegation: "agent-a-delegation",
                agentPrivateKey: "agent-a-private-key",
                gateway: "https://test.gateway.com",
            });
            await agentAAdapter.init();

            // Set up Agent B (data consumer) with Agent A's root CID
            agentBAdapter = new DatabaseAdapter({
                agentDelegation: "agent-b-delegation",
                agentPrivateKey: "agent-b-private-key",
                gateway: "https://test.gateway.com",
                rootIndexCID: sharedRootCID // Using Agent A's root CID
            });
            await agentBAdapter.init();
        });

        it("should allow Agent B to read Agent A's memories using shared root CID", async () => {
            // Create a memory as Agent A
            const memory: Memory = {
                id: "shared-memory-123" as UUID,
                roomId: "shared-room-123" as UUID,
                agentId: "agent-a-123" as UUID,
                content: { text: "Shared memory content" },
                createdAt: Date.now(),
                userId: "user-123" as UUID,
            };

            await agentAAdapter.createMemory(memory, "shared-table");

            // Agent B should be able to read the memory using the shared root CID
            const retrievedMemory = await agentBAdapter.getMemoryById("shared-memory-123" as UUID);

            expect(retrievedMemory).toBeDefined();
            expect(retrievedMemory?.id).toBe("shared-memory-123");
            expect(retrievedMemory?.content.text).toBe("Shared memory content");
        });

        it("should allow Agent B to search Agent A's memories", async () => {
            // Create memories with embeddings as Agent A
            const memory: Memory = {
                id: "shared-memory-456" as UUID,
                roomId: "shared-room-123" as UUID,
                agentId: "agent-a-123" as UUID,
                content: { text: "Searchable shared memory" },
                embedding: new Array(128).fill(0.1),
                createdAt: Date.now(),
                userId: "user-123" as UUID,
            };

            await agentAAdapter.createMemory(memory, "shared-table");

            // Agent B should be able to search memories using the shared root CID
            const searchResults = await agentBAdapter.searchMemories({
                tableName: "shared-table",
                agentId: "agent-a-123" as UUID,
                roomId: "shared-room-123" as UUID,
                embedding: new Array(128).fill(0.1),
                match_threshold: 0.8,
                match_count: 10,
                unique: true
            });

            expect(searchResults).toHaveLength(1);
            expect(searchResults[0].id).toBe("shared-memory-456");
        });

        it("should maintain chronological order across agents", async () => {
            // Create sequential memories as Agent A
            const memory1: Memory = {
                id: "seq-memory-1" as UUID,
                roomId: "shared-room-123" as UUID,
                agentId: "agent-a-123" as UUID,
                content: { text: "First memory" },
                createdAt: Date.now(),
                userId: "user-123" as UUID,
            };

            const memory2: Memory = {
                id: "seq-memory-2" as UUID,
                roomId: "shared-room-123" as UUID,
                agentId: "agent-a-123" as UUID,
                content: { text: "Second memory" },
                createdAt: Date.now(),
                userId: "user-123" as UUID,
            };

            await agentAAdapter.createMemory(memory1, "sequential-table");
            await agentAAdapter.createMemory(memory2, "sequential-table");

            // Agent B should retrieve memories in the correct order
            const memories = await agentBAdapter.getMemories({
                roomId: "shared-room-123" as UUID,
                tableName: "sequential-table",
                agentId: "agent-a-123" as UUID
            });

            expect(memories).toHaveLength(2);
            expect(memories[0].id).toBe("seq-memory-1");
            expect(memories[1].id).toBe("seq-memory-2");
            expect(new Date(memories[0].createdAt!).getTime()).toBeLessThan(new Date(memories[1].createdAt!).getTime());
        });
    });
});