/// <reference types="fhir" />

/**
 * Portal staff contact data. The backend builds R5 resources, where name and
 * telecom live under `contact[]` (ExtendedContactDetail); R4 `telecom` is a fallback.
 */
type WithContact = {
  contact?: { name?: fhir4.HumanName[] | fhir4.HumanName; telecom?: fhir4.ContactPoint[] }[];
  telecom?: fhir4.ContactPoint[];
};

export function staffContactName(resource: WithContact): string | undefined {
  const raw = resource.contact?.[0]?.name;
  const name = Array.isArray(raw) ? raw[0] : raw;
  const text =
    name?.text?.trim() ||
    [...(name?.given ?? []), name?.family].filter(Boolean).join(" ").trim();
  return text || undefined;
}

export function staffTelecom(resource: WithContact, system: "email" | "phone"): string | undefined {
  const points = [...(resource.contact ?? []).flatMap((c) => c.telecom ?? []), ...(resource.telecom ?? [])];
  return points.find((p) => p.system === system && p.value)?.value;
}
