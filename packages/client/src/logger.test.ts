import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger } from './logger.js';

// Capture stderr output
let stderrOutput: string[] = [];
const originalWrite = process.stderr.write;

describe('Logger - PII Masking', () => {
    beforeEach(() => {
        stderrOutput = [];
        process.stderr.write = ((data: any) => {
            stderrOutput.push(typeof data === 'string' ? data : JSON.stringify(data));
            return true;
        }) as any;
    });

    afterEach(() => {
        process.stderr.write = originalWrite;
    });

    it('masks taxID in logged data', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.debug('Customer data', { 
            name: 'John',
            taxID: '12345678900'
        });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.taxID).toBe('*******8900');
        expect(logged.name).toBe('John');
    });

    it('masks phone in logged data', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('Contact info', { 
            email: 'test@example.com',
            phone: '11987654321'
        });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.phone).toBe('*******4321');
        expect(logged.email).toBe('test@example.com');
    });

    it('masks appId in logged data', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.debug('Client init', { 
            appId: 'test-app-id-12345',
            baseUrl: 'https://api.woovi.com'
        });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.appId).toContain('*');
        expect(logged.baseUrl).toBe('https://api.woovi.com');
    });

    it('masks cpf field', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('CPF data', { cpf: '12345678900' });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.cpf).toBe('*******8900');
    });

    it('masks cnpj field', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('CNPJ data', { cnpj: '12345678901234' });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.cnpj).toBe('**********1234');
    });

    it('masks nested sensitive data', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('Nested data', { 
            customer: {
                name: 'John',
                taxID: '12345678900'
            }
        });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.customer.taxID).toBe('*******8900');
        expect(logged.customer.name).toBe('John');
    });

    it('masks sensitive data in arrays', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('Customer list', { 
            customers: [
                { name: 'John', phone: '11987654321' },
                { name: 'Jane', phone: '11912345678' }
            ]
        });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.customers[0].phone).toBe('*******4321');
        expect(logged.customers[1].phone).toBe('*******5678');
        expect(logged.customers[0].name).toBe('John');
    });

    it('handles undefined/null data gracefully', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('No data');
        logger.info('Null data', null as any);

        expect(stderrOutput.length >= 1).toBe(true);
        const logged1 = JSON.parse(stderrOutput[0]);
        expect(logged1.level).toBe('info');
    });

    it('does not mask non-sensitive numeric fields', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('Transaction', { 
            amount: 5000,
            value: 100.50
        });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.amount).toBe(5000);
        expect(logged.value).toBe(100.50);
    });

    it('still writes to stderr', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.debug('Test message', { taxID: '12345678900' });

        expect(stderrOutput.length).toBeGreaterThan(0);
        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.timestamp).toBeDefined();
        expect(logged.level).toBe('debug');
    });

    it('masks taxId variant field', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('Tax ID variant', { taxId: '98765432100' });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.taxId).toBe('*******2100');
    });

    it('masks phoneNumber field', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('Phone number', { phoneNumber: '21987654321' });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.phoneNumber).toBe('*******4321');
    });

    it('masks telephone field', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('Telephone', { telephone: '1133334444' });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.telephone).toBe('******4444');
    });

    it('masks mobile field', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('Mobile', { mobile: '11999999999' });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.mobile).toBe('*******9999');
    });

    it('handles deeply nested mixed data', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('Complex data', {
            transaction: {
                id: 'tx-123',
                customer: {
                    name: 'Alice',
                    taxID: '12345678900',
                    contacts: [
                        { type: 'mobile', phone: '11987654321' }
                    ]
                },
                amount: 5000
            }
        });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.transaction.customer.taxID).toBe('*******8900');
        expect(logged.transaction.customer.contacts[0].phone).toBe('*******4321');
        expect(logged.transaction.customer.name).toBe('Alice');
        expect(logged.transaction.amount).toBe(5000);
    });
});
