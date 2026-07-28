/// <reference types="fhir" />

import { PatientModel } from "../models/patient";
import BaseFhirConverter from "./base";
import { OPENIMIS_IDENTIFIER_SYSTEM } from "./constants";
import {
  assertResourceType,
  buildOpenImisIdentifier,
  buildPersonName,
  buildReference,
  buildTelecom,
  genderFromFhir,
  genderToFhir,
  getExtension,
  getExtensionBoolean,
  getExtensionCodeableConcept,
  getExtensionString,
  getIdentifierValue,
  getTelecom,
  getUsualOrOfficialName,
  getUuidIdentifier,
  referenceId,
} from "./helpers";

class PatientFhirConverter extends BaseFhirConverter<
  PatientModel,
  fhir4.Patient
> {
  readonly resourceType = "Patient";

  fromFhir(resource: fhir4.Patient): PatientModel {
    assertResourceType(resource, "Patient");

    const { family, given } = getUsualOrOfficialName(resource);
    const identifiers = resource.identifier;
    const uuid =
      getUuidIdentifier(identifiers, OPENIMIS_IDENTIFIER_SYSTEM) ??
      getUuidIdentifier(identifiers) ??
      (resource.id && resource.id.includes("-") ? resource.id : undefined);
    const chfId =
      getIdentifierValue(identifiers, {
        system: OPENIMIS_IDENTIFIER_SYSTEM,
        preferNonUuid: true,
      }) ??
      getIdentifierValue(identifiers, { preferNonUuid: true }) ??
      "";

    const education = getExtensionCodeableConcept(
      resource.extension,
      "patient-education-level"
    );
    const profession = getExtensionCodeableConcept(
      resource.extension,
      "patient-profession"
    );
    const identification = getExtension(
      resource.extension,
      "patient-identification"
    );
    const passportFromExt = identification?.extension?.find(
      (entry) => entry.url === "number" || entry.url.endsWith("/number")
    )?.valueString;
    const identificationType = identification?.extension?.find(
      (entry) => entry.url === "type" || entry.url.endsWith("/type")
    )?.valueCodeableConcept?.coding?.[0]?.code;

    const address = resource.address?.[0];
    const municipality = getExtensionString(
      address?.extension,
      "address-municipality"
    );
    const locationRef = getExtension(
      address?.extension,
      "address-location-reference"
    )?.valueReference;
    const familyRef = getExtensionString(
      resource.extension,
      "patient-group-reference"
    );
    const contact = resource.contact?.[0];
    const photo = resource.photo?.[0];

    return new PatientModel(
      resource.id ?? chfId ?? uuid ?? "",
      chfId,
      family ?? "",
      given ?? "",
      uuid,
      resource.birthDate,
      genderFromFhir(resource.gender),
      resource.maritalStatus?.coding?.[0]?.code,
      getTelecom(resource.telecom, "phone"),
      getTelecom(resource.telecom, "email"),
      getExtensionBoolean(resource.extension, "patient-is-head") ?? false,
      getExtensionBoolean(resource.extension, "patient-card-issued") ?? false,
      education?.code,
      education?.display,
      profession?.code,
      profession?.display,
      getIdentifierValue(identifiers, { typeCode: "PPN" }) ?? passportFromExt,
      identificationType,
      familyRef?.includes("/") ? familyRef.split("/").pop() : familyRef,
      contact?.relationship?.[0]?.coding?.[0]?.code,
      contact?.relationship?.[0]?.coding?.[0]?.display,
      referenceId(resource.generalPractitioner?.[0]),
      address?.text,
      referenceId(locationRef),
      address?.state,
      address?.district,
      municipality,
      address?.city,
      address?.use,
      photo?.url,
      photo?.title,
      photo?.contentType,
      photo?.creation,
      photo?.data
    );
  }

  toFhir(model: PatientModel): fhir4.Patient {
    const identifiers: fhir4.Identifier[] = [];
    if (model.uuid) {
      identifiers.push(buildOpenImisIdentifier(model.uuid));
    }
    if (model.chfId) {
      identifiers.push(buildOpenImisIdentifier(model.chfId));
    }
    if (model.passport) {
      identifiers.push({
        ...buildOpenImisIdentifier(model.passport),
        type: { coding: [{ code: "PPN", display: "Passport Number" }] },
      });
    }

    const extensions: fhir4.Extension[] = [
      {
        url: "StructureDefinition/patient-is-head",
        valueBoolean: model.isHead,
      },
      {
        url: "StructureDefinition/patient-card-issued",
        valueBoolean: model.cardIssued,
      },
    ];

    if (model.educationId) {
      extensions.push({
        url: "StructureDefinition/patient-education-level",
        valueCodeableConcept: {
          coding: [
            {
              system: "CodeSystem/patient-education-level",
              code: model.educationId,
              display: model.educationDisplay,
            },
          ],
        },
      });
    }
    if (model.professionId) {
      extensions.push({
        url: "StructureDefinition/patient-profession",
        valueCodeableConcept: {
          coding: [
            {
              system: "CodeSystem/patient-profession",
              code: model.professionId,
              display: model.professionDisplay,
            },
          ],
        },
      });
    }
    if (model.familyUuid) {
      extensions.push({
        url: "StructureDefinition/patient-group-reference",
        valueReference: buildReference("Group", model.familyUuid),
      });
    }
    if (model.passport && model.identificationTypeCode) {
      extensions.push({
        url: "StructureDefinition/patient-identification",
        extension: [
          { url: "number", valueString: model.passport },
          {
            url: "type",
            valueCodeableConcept: {
              coding: [
                {
                  system: "CodeSystem/patient-identification-type",
                  code: model.identificationTypeCode,
                },
              ],
            },
          },
        ],
      });
    }

    const addressExtensions: fhir4.Extension[] = [];
    if (model.municipality) {
      addressExtensions.push({
        url: "StructureDefinition/address-municipality",
        valueString: model.municipality,
      });
    }
    if (model.locationUuid) {
      addressExtensions.push({
        url: "StructureDefinition/address-location-reference",
        valueReference: buildReference("Location", model.locationUuid),
      });
    }

    const patient: fhir4.Patient = {
      resourceType: "Patient",
      id: model.id || model.uuid || model.chfId,
      identifier: identifiers.length ? identifiers : undefined,
      name: [buildPersonName(model.lastName, model.otherNames, "usual")],
      birthDate: model.birthDate,
      gender: genderToFhir(model.gender),
      telecom: buildTelecom(model.phone, model.email),
      extension: extensions,
      maritalStatus: model.maritalStatus
        ? { coding: [{ code: model.maritalStatus }] }
        : undefined,
      address:
        model.currentAddress || model.locationUuid
          ? [
              {
                type: "physical",
                use: (model.addressUse as fhir4.Address["use"]) ?? "temp",
                text: model.currentAddress,
                state: model.state,
                district: model.district,
                city: model.city,
                extension: addressExtensions.length
                  ? addressExtensions
                  : undefined,
              },
            ]
          : undefined,
      generalPractitioner: model.healthFacilityId
        ? [buildReference("Organization", model.healthFacilityId)]
        : undefined,
      photo: model.photoUrl || model.photoData
        ? [
            {
              url: model.photoUrl,
              title: model.photoTitle,
              contentType: model.photoContentType,
              creation: model.photoCreation,
              data: model.photoData,
            },
          ]
        : undefined,
    };

    return patient;
  }
}

export default PatientFhirConverter;
