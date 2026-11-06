import { getCorsOrigins } from './cors-origins';

describe('getCorsOrigins', () => {
    it('parses and trims the configured origin list', () => {
        expect(
            getCorsOrigins(
                'https://web.example.test, https://admin.example.test',
            ),
        ).toEqual(['https://web.example.test', 'https://admin.example.test']);
    });

    it('uses the singular legacy setting when the plural setting is absent', () => {
        expect(getCorsOrigins(undefined, 'https://web.example.test')).toEqual([
            'https://web.example.test',
        ]);
    });

    it('defaults to the local frontend origin when no setting exists', () => {
        expect(getCorsOrigins()).toEqual(['http://localhost:3000']);
    });
});
