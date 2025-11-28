export interface FHIRConverter<T, F = any> {
  fromFhir(fhirData: F): T;

  toFhir(domainData: T): F;
}

export abstract class BaseFhirConverter<T, F = any>
  implements FHIRConverter<T, F>
{
  abstract fromFhir(fhirData: F): T;

  abstract toFhir(domainData: T): F;

  protected safeExtract<V>(
    data: any,
    path: string,
    defaultValue?: V,
  ): V | undefined {
    try {
      const keys = path.split(".");
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

  protected findIdentifierBySystem(
    identifiers: any[],
    system: string,
  ): string | undefined {
    return identifiers?.find((id) => id.system === system)?.value;
  }
}
