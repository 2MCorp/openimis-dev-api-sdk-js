/**
 * Base converter interface for FHIR resource conversion
 */
export interface FHIRConverter<T, F = any> {
    /**
     * Convert from FHIR resource to domain model
     */
    fromFhir(fhirData: F): T;

    /**
     * Convert from domain model to FHIR resource
     */
    toFhir(domainData: T): F;
}

/**
 * Abstract base class for FHIR converters
 */
export abstract class BaseFhirConverter<T, F = any> implements FHIRConverter<T, F> {
    /**
     * Convert from FHIR resource to domain model
     * Must be implemented by subclasses
     */
    abstract fromFhir(fhirData: F): T;

    /**
     * Convert from domain model to FHIR resource
     * Must be implemented by subclasses
     */
    abstract toFhir(domainData: T): F;

    /**
     * Safely extract value from FHIR data with optional default
     */
    protected safeExtract<V>(data: any, path: string, defaultValue?: V): V | undefined {
        try {
            const keys = path.split('.');
            let current = data;

            for (const key of keys) {
                if (current === null || current === undefined) {
                    return defaultValue;
                }
                current = current[key];
            }

            return current ?? defaultValue;
        } catch {
            return defaultValue;
        }
    }

    /**
     * Find identifier by system in FHIR identifier array
     */
    protected findIdentifierBySystem(identifiers: any[], system: string): string | undefined {
        return identifiers?.find(id => id.system === system)?.value;
    }
}