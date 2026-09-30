/// <reference types="fhir" />

import {
  FACILITY_REFERENCE_SYSTEM,
  OPENIMIS_IDENTIFIER_SYSTEM,
} from "./constants";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined | null): boolean {
  return !!value && UUID_RE.test(value);
}

export function getIdentifierValue(
  identifiers: fhir4.Identifier[] | undefined,
  options: {
    system?: string;
    systemIncludes?: string;
    typeCode?: string;
    preferNonUuid?: boolean;
  } = {}
): string | undefined {
  if (!identifiers?.length) {
    return undefined;
  }

  if (options.typeCode) {
    const byType = identifiers.find((identifier) =>
      identifier.type?.coding?.some(
        (coding) => coding.code === options.typeCode
      )
    );
    if (byType?.value) {
      return byType.value;
    }
  }

  let scoped = identifiers;
  if (options.system) {
    scoped = identifiers.filter(
      (identifier) => identifier.system === options.system
    );
  } else if (options.systemIncludes) {
    scoped = identifiers.filter((identifier) =>
      identifier.system?.includes(options.systemIncludes!)
    );
  }

  if (options.preferNonUuid) {
    const nonUuid = scoped.find(
      (identifier) => identifier.value && !isUuid(identifier.value)
    );
    if (nonUuid?.value) {
      return nonUuid.value;
    }
  }

  return scoped.find((identifier) => identifier.value)?.value;
}

export function getUuidIdentifier(
  identifiers: fhir4.Identifier[] | undefined,
  system?: string
): string | undefined {
  const scoped = system
    ? identifiers?.filter((identifier) => identifier.system === system)
    : identifiers;
  return scoped?.find((identifier) => isUuid(identifier.value))?.value;
}

/** Mirrors BaseFHIRConverter.get_fhir_identifier_by_code (substring in system). */
export function getIdentifierBySystemLookup(
  identifiers: fhir4.Identifier[] | undefined,
  lookupCode: string
): string | undefined {
  return identifiers?.find((identifier) =>
    identifier.system?.includes(lookupCode)
  )?.value;
}

export function buildOpenImisIdentifier(value: string): fhir4.Identifier {
  return {
    system: OPENIMIS_IDENTIFIER_SYSTEM,
    value: String(value),
  };
}

export function getUsualOrOfficialName(patient: fhir4.Patient): {
  family?: string;
  given?: string;
  use?: string;
} {
  const names = patient.name ?? [];
  const preferred =
    names.find((name) => name.use === "usual") ??
    names.find((name) => name.use === "official") ??
    names[0];

  return {
    family: preferred?.family,
    given: preferred?.given?.[0],
    use: preferred?.use,
  };
}

export function buildPersonName(
  lastName: string,
  otherNames: string,
  use: "usual" | "official" = "usual"
): fhir4.HumanName {
  return {
    use,
    family: lastName,
    given: otherNames ? [otherNames] : undefined,
  };
}

export function getTelecom(
  telecom: fhir4.ContactPoint[] | undefined,
  system: fhir4.ContactPoint["system"]
): string | undefined {
  return telecom?.find((entry) => entry.system === system)?.value;
}

export function buildTelecom(
  phone?: string,
  email?: string
): fhir4.ContactPoint[] | undefined {
  const telecom: fhir4.ContactPoint[] = [];
  if (phone) {
    telecom.push({ system: "phone", use: "home", value: phone });
  }
  if (email) {
    telecom.push({ system: "email", use: "home", value: email });
  }
  return telecom.length ? telecom : undefined;
}

export function getExtension(
  extensions: fhir4.Extension[] | undefined,
  urlSuffix: string
): fhir4.Extension | undefined {
  return extensions?.find(
    (extension) =>
      extension.url === urlSuffix ||
      extension.url.endsWith(urlSuffix) ||
      extension.url.includes(urlSuffix)
  );
}

export function getExtensionBoolean(
  extensions: fhir4.Extension[] | undefined,
  urlSuffix: string
): boolean | undefined {
  return getExtension(extensions, urlSuffix)?.valueBoolean;
}

export function getExtensionString(
  extensions: fhir4.Extension[] | undefined,
  urlSuffix: string
): string | undefined {
  const extension = getExtension(extensions, urlSuffix);
  return (
    extension?.valueString ??
    extension?.valueCoding?.display ??
    extension?.valueCoding?.code ??
    extension?.valueCodeableConcept?.coding?.[0]?.code ??
    extension?.valueCodeableConcept?.coding?.[0]?.display ??
    extension?.valueReference?.reference
  );
}

export function getExtensionDecimal(
  extensions: fhir4.Extension[] | undefined,
  urlSuffix: string
): number | undefined {
  const extension = getExtension(extensions, urlSuffix);
  if (typeof extension?.valueDecimal === "number") {
    return extension.valueDecimal;
  }
  if (typeof extension?.valueMoney?.value === "number") {
    return extension.valueMoney.value;
  }

  const display = extension?.valueCoding?.display;
  if (!display) {
    return undefined;
  }

  const match = display.replace(/[^0-9.-]/g, "");
  const parsed = Number(match);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getExtensionCodeableConcept(
  extensions: fhir4.Extension[] | undefined,
  urlSuffix: string
): { code?: string; display?: string; system?: string } | undefined {
  const coding = getExtension(extensions, urlSuffix)?.valueCodeableConcept
    ?.coding?.[0];
  if (!coding) {
    return undefined;
  }
  return {
    code: coding.code,
    display: coding.display,
    system: coding.system,
  };
}

export function referenceId(
  reference: fhir4.Reference | undefined
): string | undefined {
  if (!reference) {
    return undefined;
  }
  if (reference.identifier?.value) {
    return reference.identifier.value;
  }
  const ref = reference.reference;
  if (!ref) {
    return undefined;
  }
  const parts = ref.split("/");
  return parts[parts.length - 1] || undefined;
}

export function buildReference(
  resourceType: string,
  id: string,
  display?: string
): fhir4.Reference {
  const trimmedId = (id ?? "").trim();
  const trimmedDisplay = (display ?? "").trim();
  return {
    type: resourceType,
    ...(trimmedId ? { reference: `${resourceType}/${trimmedId}` } : {}),
    ...(trimmedDisplay ? { display: trimmedDisplay } : {}),
    ...(trimmedId
      ? {
          identifier: {
            system: FACILITY_REFERENCE_SYSTEM,
            value: trimmedId,
          },
        }
      : {}),
  };
}

export function buildMoney(
  value: number,
  currency = "$"
): fhir4.Money {
  return { value, currency };
}

export function assertResourceType<T extends { resourceType?: string }>(
  resource: T,
  expected: string
): asserts resource is T & { resourceType: string } {
  if (resource.resourceType !== expected) {
    throw new Error(
      `Expected FHIR resourceType "${expected}", got "${resource.resourceType ?? "undefined"}"`
    );
  }
}

export function resourcesFromBundle<T extends fhir4.FhirResource>(
  bundle: fhir4.Bundle,
  resourceType?: string
): T[] {
  assertResourceType(bundle, "Bundle");
  const resources: T[] = [];

  for (const entry of bundle.entry ?? []) {
    const resource = entry.resource;
    if (!resource) {
      continue;
    }
    if (resourceType && resource.resourceType !== resourceType) {
      continue;
    }
    resources.push(resource as T);
  }

  return resources;
}

export function parseSearchBundle<T>(
  bundle: fhir4.Bundle,
  mapResource: (resource: fhir4.FhirResource) => T
): {
  total: number;
  selfUrl?: string;
  nextUrl?: string;
  previousUrl?: string;
  items: T[];
} {
  assertResourceType(bundle, "Bundle");
  const link = (relation: string) =>
    bundle.link?.find((entry) => entry.relation === relation)?.url;

  return {
    total: bundle.total ?? bundle.entry?.length ?? 0,
    selfUrl: link("self"),
    nextUrl: link("next"),
    previousUrl: link("previous"),
    items: (bundle.entry ?? [])
      .map((entry) => entry.resource)
      .filter((resource): resource is fhir4.FhirResource => !!resource)
      .map(mapResource),
  };
}

export function genderFromFhir(
  gender: fhir4.Patient["gender"] | undefined
): "male" | "female" | "other" | "unknown" | undefined {
  if (!gender) {
    return undefined;
  }
  return gender;
}

export function genderToFhir(
  gender: string | undefined
): fhir4.Patient["gender"] | undefined {
  if (!gender) {
    return undefined;
  }
  const normalized = gender.toLowerCase();
  if (
    normalized === "male" ||
    normalized === "female" ||
    normalized === "other" ||
    normalized === "unknown"
  ) {
    return normalized;
  }
  if (normalized === "m") return "male";
  if (normalized === "f") return "female";
  if (normalized === "o") return "other";
  return "unknown";
}
