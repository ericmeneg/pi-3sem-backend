export function getCorsOrigins(
    configuredOrigins?: string,
    legacyOrigin?: string,
): string[] {
    const origins = configuredOrigins ?? legacyOrigin;
    return (
        origins
            ?.split(',')
            .map((origin) => origin.trim())
            .filter(Boolean) ?? ['http://localhost:3000']
    );
}
