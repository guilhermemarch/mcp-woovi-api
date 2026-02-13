import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WooviClient } from '@woovi/client';
import { registerChargeTools } from './charges.js';
describe('Charge Tools', () => {
    let mockClient;
    beforeEach(() => {
        vi.clearAllMocks();
        mockClient = new WooviClient('test-app-id');
    });
    describe('create_charge tool', () => {
        it('should register with correct name and description', () => {
            const registeredTools = [];
            const mockServer = {
                registerTool: vi.fn((name, config, handler) => {
                    registeredTools.push({ name, ...config, handler });
                }),
            };
            registerChargeTools(mockServer, mockClient);
            const createChargeTool = registeredTools.find(t => t.name === 'create_charge');
            expect(createChargeTool).toBeDefined();
            expect(createChargeTool.description).toContain('centavos');
        });
        it('should validate input with Zod schema requiring amount and customer', async () => {
            const registeredTools = [];
            const mockServer = {
                registerTool: vi.fn((name, config, handler) => {
                    registeredTools.push({ name, ...config, handler });
                }),
            };
            registerChargeTools(mockServer, mockClient);
            const createChargeTool = registeredTools.find(t => t.name === 'create_charge');
            const schema = createChargeTool.inputSchema;
            // Valid input should parse
            const validInput = {
                amount: 5000,
                customer: { name: 'Test Customer' },
            };
            expect(() => schema.parse(validInput)).not.toThrow();
            // Invalid input (missing amount) should fail
            const invalidInput = { customer: { name: 'Test' } };
            expect(() => schema.parse(invalidInput)).toThrow();
        });
        it('should call wooviClient.createCharge() with correct data', async () => {
            const registeredTools = [];
            const mockServer = {
                registerTool: vi.fn((name, config, handler) => {
                    registeredTools.push({ name, ...config, handler });
                }),
            };
            const mockCreateCharge = vi.fn().mockResolvedValue({
                charge: 'base64id',
                correlationID: 'test-123',
                value: 5000,
                status: 'active',
                brCode: 'br-code',
                qrCodeImage: 'data:image',
                createdAt: '2026-02-12T00:00:00Z',
            });
            const mockClient = {
                createCharge: mockCreateCharge,
            };
            registerChargeTools(mockServer, mockClient);
            const createChargeTool = registeredTools.find(t => t.name === 'create_charge');
            const result = await createChargeTool.handler({
                amount: 5000,
                customer: { name: 'Test Customer', email: 'test@example.com' },
            });
            expect(mockCreateCharge).toHaveBeenCalledWith({
                amount: 5000,
                description: '',
                customer: { name: 'Test Customer', email: 'test@example.com' },
            });
            expect(result.content[0].type).toBe('text');
            expect(result.content[0].text).toContain('base64id');
        });
        it('should return MCP-compliant response format', async () => {
            const registeredTools = [];
            const mockServer = {
                registerTool: vi.fn((name, config, handler) => {
                    registeredTools.push({ name, ...config, handler });
                }),
            };
            const mockClient = {
                createCharge: vi.fn().mockResolvedValue({ charge: 'id', correlationID: 'test' }),
            };
            registerChargeTools(mockServer, mockClient);
            const createChargeTool = registeredTools.find(t => t.name === 'create_charge');
            const result = await createChargeTool.handler({ amount: 1000, customer: { name: 'Test' } });
            expect(result).toHaveProperty('content');
            expect(Array.isArray(result.content)).toBe(true);
            expect(result.content[0]).toHaveProperty('type', 'text');
            expect(result.content[0]).toHaveProperty('text');
        });
        it('should handle errors with isError flag', async () => {
            const registeredTools = [];
            const mockServer = {
                registerTool: vi.fn((name, config, handler) => {
                    registeredTools.push({ name, ...config, handler });
                }),
            };
            const mockClient = {
                createCharge: vi.fn().mockRejectedValue(new Error('API failure')),
            };
            registerChargeTools(mockServer, mockClient);
            const createChargeTool = registeredTools.find(t => t.name === 'create_charge');
            const result = await createChargeTool.handler({ amount: 1000, customer: { name: 'Test' } });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Error:');
            expect(result.content[0].text).toContain('API failure');
        });
    });
    describe('get_charge tool', () => {
        it('should register with correct name and description', () => {
            const registeredTools = [];
            const mockServer = {
                registerTool: vi.fn((name, config, handler) => {
                    registeredTools.push({ name, ...config, handler });
                }),
            };
            registerChargeTools(mockServer, mockClient);
            const getChargeTool = registeredTools.find(t => t.name === 'get_charge');
            expect(getChargeTool).toBeDefined();
            expect(getChargeTool.description).toBeTruthy();
        });
        it('should validate input with Zod schema requiring correlationID', async () => {
            const registeredTools = [];
            const mockServer = {
                registerTool: vi.fn((name, config, handler) => {
                    registeredTools.push({ name, ...config, handler });
                }),
            };
            registerChargeTools(mockServer, mockClient);
            const getChargeTool = registeredTools.find(t => t.name === 'get_charge');
            const schema = getChargeTool.inputSchema;
            // Valid input should parse
            expect(() => schema.parse({ correlationID: 'test-123' })).not.toThrow();
            // Invalid input (missing correlationID) should fail
            expect(() => schema.parse({})).toThrow();
        });
        it('should call wooviClient.getCharge() with correlationID', async () => {
            const registeredTools = [];
            const mockServer = {
                registerTool: vi.fn((name, config, handler) => {
                    registeredTools.push({ name, ...config, handler });
                }),
            };
            const mockGetCharge = vi.fn().mockResolvedValue({
                charge: 'base64id',
                correlationID: 'test-123',
                value: 5000,
                status: 'active',
            });
            const mockClient = {
                getCharge: mockGetCharge,
            };
            registerChargeTools(mockServer, mockClient);
            const getChargeTool = registeredTools.find(t => t.name === 'get_charge');
            await getChargeTool.handler({ correlationID: 'test-123' });
            expect(mockGetCharge).toHaveBeenCalledWith('test-123');
        });
    });
    describe('list_charges tool', () => {
        it('should register with correct name and description', () => {
            const registeredTools = [];
            const mockServer = {
                registerTool: vi.fn((name, config, handler) => {
                    registeredTools.push({ name, ...config, handler });
                }),
            };
            registerChargeTools(mockServer, mockClient);
            const listChargesTool = registeredTools.find(t => t.name === 'list_charges');
            expect(listChargesTool).toBeDefined();
            expect(listChargesTool.description).toBeTruthy();
        });
        it('should validate input with Zod schema for status, dates, pagination', async () => {
            const registeredTools = [];
            const mockServer = {
                registerTool: vi.fn((name, config, handler) => {
                    registeredTools.push({ name, ...config, handler });
                }),
            };
            registerChargeTools(mockServer, mockClient);
            const listChargesTool = registeredTools.find(t => t.name === 'list_charges');
            const schema = listChargesTool.inputSchema;
            // Valid input with all fields
            expect(() => schema.parse({
                status: 'active',
                startDate: '2026-01-01',
                endDate: '2026-12-31',
                skip: 0,
                limit: 10,
            })).not.toThrow();
            // Valid input with no fields (all optional)
            expect(() => schema.parse({})).not.toThrow();
            // Invalid status should fail
            expect(() => schema.parse({ status: 'invalid' })).toThrow();
        });
        it('should call wooviClient.listCharges() with filters', async () => {
            const registeredTools = [];
            const mockServer = {
                registerTool: vi.fn((name, config, handler) => {
                    registeredTools.push({ name, ...config, handler });
                }),
            };
            const mockListCharges = vi.fn().mockResolvedValue({
                items: [],
                pageInfo: { skip: 0, limit: 10, totalCount: 0, hasNextPage: false },
            });
            const mockClient = {
                listCharges: mockListCharges,
            };
            registerChargeTools(mockServer, mockClient);
            const listChargesTool = registeredTools.find(t => t.name === 'list_charges');
            await listChargesTool.handler({ status: 'active', skip: 10, limit: 20 });
            expect(mockListCharges).toHaveBeenCalledWith({
                status: 'active',
                skip: 10,
                limit: 20,
            });
        });
        it('should return paginated results in MCP format', async () => {
            const registeredTools = [];
            const mockServer = {
                registerTool: vi.fn((name, config, handler) => {
                    registeredTools.push({ name, ...config, handler });
                }),
            };
            const mockClient = {
                listCharges: vi.fn().mockResolvedValue({
                    items: [{ charge: 'id1' }, { charge: 'id2' }],
                    pageInfo: { skip: 0, limit: 10, totalCount: 2, hasNextPage: false },
                }),
            };
            registerChargeTools(mockServer, mockClient);
            const listChargesTool = registeredTools.find(t => t.name === 'list_charges');
            const result = await listChargesTool.handler({});
            expect(result.content[0].type).toBe('text');
            expect(result.content[0].text).toContain('id1');
            expect(result.content[0].text).toContain('id2');
        });
    });
});
//# sourceMappingURL=charges.test.js.map