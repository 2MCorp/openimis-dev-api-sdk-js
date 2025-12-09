export interface FHIRConverter<T, F = any> {
  fromFhir(fhirData: F): T;

  toFhir(domainData: T): F;
}

export abstract class BaseFhirConverter {
  abstract fromFhir(data: BaseFhirConverter): any;

  abstract toFhir(data: BaseFhirConverter): any;

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

  toJson(): string {
    return JSON.stringify(this);
  }

  protected findIdentifierBySystem(
    identifiers: any[],
    system: string,
  ): string | undefined {
    return identifiers?.find((id) => id.system === system)?.value;
  }
}
