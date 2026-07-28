/// <reference types="fhir" />

import { GeoLocationModel } from "../models/location";
import BaseFhirConverter from "./base";
import { OPENIMIS_IDENTIFIER_SYSTEM } from "./constants";
import {
  assertResourceType,
  getIdentifierValue,
  getUuidIdentifier,
  referenceId,
} from "./helpers";

class LocationFhirConverter extends BaseFhirConverter<
  GeoLocationModel,
  fhir4.Location
> {
  readonly resourceType = "Location";

  fromFhir(resource: fhir4.Location): GeoLocationModel {
    assertResourceType(resource, "Location");
    return new GeoLocationModel(
      resource.id ?? "",
      getIdentifierValue(resource.identifier, {
        system: OPENIMIS_IDENTIFIER_SYSTEM,
        preferNonUuid: true,
      }) ??
        getIdentifierValue(resource.identifier, { preferNonUuid: true }) ??
        "",
      resource.name ?? "",
      resource.physicalType?.coding?.[0]?.code,
      getUuidIdentifier(resource.identifier, OPENIMIS_IDENTIFIER_SYSTEM) ??
        getUuidIdentifier(resource.identifier),
      referenceId(resource.partOf),
      resource.status
    );
  }

  toFhir(model: GeoLocationModel): fhir4.Location {
    return {
      resourceType: "Location",
      id: model.id || model.uuid || model.code,
      status: (model.status as fhir4.Location["status"]) ?? "active",
      name: model.name,
      mode: "instance",
      identifier: [
        ...(model.uuid
          ? [{ system: OPENIMIS_IDENTIFIER_SYSTEM, value: model.uuid }]
          : []),
        { system: OPENIMIS_IDENTIFIER_SYSTEM, value: model.code },
      ],
      physicalType: model.type
        ? { coding: [{ code: model.type }] }
        : undefined,
      partOf: model.parentId
        ? { reference: `Location/${model.parentId}` }
        : undefined,
    };
  }
}

export default LocationFhirConverter;
