/// <reference types="fhir" />

import {
  EmployeeGroupModel,
  FamilyGroupModel,
  GroupMemberModel,
} from "../models/group";
import {
  assertResourceType,
  getExtension,
  getExtensionBoolean,
  getExtensionString,
  getIdentifierValue,
  getUuidIdentifier,
  referenceId,
  resourcesFromBundle,
} from "./helpers";

function membersFromGroup(resource: fhir4.Group): GroupMemberModel[] {
  return (resource.member ?? []).map((member) => {
    const entity = member.entity;
    return new GroupMemberModel(
      referenceId(entity) ?? entity?.identifier?.value ?? "",
      entity?.display,
      entity?.identifier?.system?.includes("4122")
        ? entity.identifier.value
        : undefined
    );
  });
}

class FamilyGroupFhirConverter {
  readonly resourceType = "Group";

  fromFhir(resource: fhir4.Group): FamilyGroupModel {
    assertResourceType(resource, "Group");
    const locationExt = getExtension(
      resource.extension,
      "address-location-reference"
    );
    return new FamilyGroupModel(
      resource.id ?? "",
      resource.name ?? "",
      getUuidIdentifier(resource.identifier) ??
        getIdentifierValue(resource.identifier, {
          systemIncludes: "4122",
        }),
      getIdentifierValue(resource.identifier, { preferNonUuid: true }),
      resource.active,
      resource.quantity,
      membersFromGroup(resource),
      getExtensionBoolean(resource.extension, "group-poverty-status"),
      getExtensionString(resource.extension, "group-type"),
      getExtensionString(resource.extension, "group-address"),
      referenceId(locationExt?.valueReference)
    );
  }

  fromBundle(bundle: fhir4.Bundle): FamilyGroupModel[] {
    return resourcesFromBundle<fhir4.Group>(bundle, "Group").map((group) =>
      this.fromFhir(group)
    );
  }

  toFhir(model: FamilyGroupModel): fhir4.Group {
    return {
      resourceType: "Group",
      id: model.id || model.uuid,
      type: "person",
      actual: true,
      name: model.name,
      active: model.active,
      quantity: model.quantity ?? model.members.length,
      identifier: [
        ...(model.uuid
          ? [{ system: "urn:ietf:rfc:4122", value: model.uuid }]
          : []),
        ...(model.headChfId ? [{ value: model.headChfId }] : []),
      ],
      member: model.members.map((member) => ({
        entity: {
          reference: `Patient/${member.chfId}`,
          display: member.display,
        },
      })),
    };
  }
}

class EmployeeGroupFhirConverter {
  readonly resourceType = "Group";

  fromFhir(resource: fhir4.Group): EmployeeGroupModel {
    assertResourceType(resource, "Group");
    return new EmployeeGroupModel(
      getIdentifierValue(resource.identifier, {
        systemIncludes: "employee-group-id",
      }) ??
        resource.id ??
        "",
      resource.type ?? "organization",
      getIdentifierValue(resource.identifier, {
        systemIncludes: "4122",
      }) ?? getUuidIdentifier(resource.identifier),
      "definitional",
      membersFromGroup(resource)
    );
  }

  fromBundle(bundle: fhir4.Bundle): EmployeeGroupModel[] {
    return resourcesFromBundle<fhir4.Group>(bundle, "Group").map((group) =>
      this.fromFhir(group)
    );
  }

  toFhir(model: EmployeeGroupModel): fhir4.Group {
    return {
      resourceType: "Group",
      id: model.id || model.uuid,
      type: model.type as fhir4.Group["type"],
      actual: false,
      identifier: [
        {
          system: "http://example.com/fhir/employee-group-id",
          value: model.id,
          use: "official",
          type: { coding: [{ code: "employee-group-id" }] },
        },
        ...(model.uuid
          ? [
              {
                system: "urn:ietf:rfc:4122",
                value: model.uuid,
                type: { coding: [{ code: "uuid" }] },
              },
            ]
          : []),
      ],
      member: model.members.map((member) => ({
        entity: {
          reference: member.chfId,
          display: member.display,
          identifier: member.insureeUuid
            ? {
                system: "urn:ietf:rfc:4122",
                value: member.insureeUuid,
              }
            : undefined,
        },
      })),
    };
  }
}

export { FamilyGroupFhirConverter, EmployeeGroupFhirConverter };
