import { AddressFhirConverter, AddressModel } from "./address";
import { BaseFhirConverter } from "./base";
import { Patient, FHIRPatient } from "../types";
import { ValidationError } from "../errors";

export class PatientModel implements Patient {
  chfId: string;
  lastName: string;
  otherNames: string;
  gender: string;
  birthDate: string;
  photo?: string;
  addresses?: AddressModel[];

  constructor(data: Patient) {
    this.chfId = data.chfId;
    this.lastName = data.lastName;
    this.otherNames = data.otherNames;
    this.gender = data.gender;
    this.birthDate = data.birthDate;
    this.photo = data.photo;
    this.addresses = data.addresses?.map((addr) =>
      addr instanceof AddressModel ? addr : new AddressModel(addr),
    );
  }

  get fullName(): string {
    return `${this.otherNames} ${this.lastName}`.trim();
  }

  isValid(): boolean {
    return !!(
      this.chfId?.trim() &&
      this.lastName?.trim() &&
      this.otherNames?.trim() &&
      this.gender?.trim() &&
      this.birthDate?.trim() &&
      this.isValidGender() &&
      this.isValidBirthDate()
    );
  }

  private isValidGender(): boolean {
    const validGenders = ["male", "female", "other", "unknown"];
    return validGenders.includes(this.gender.toLowerCase());
  }

  private isValidBirthDate(): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(this.birthDate) && !isNaN(Date.parse(this.birthDate));
  }

  get age(): number | null {
    try {
      const birth = new Date(this.birthDate);
      const now = new Date();
      const diff = now.getTime() - birth.getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    } catch {
      return null;
    }
  }
}

/**
 * Converter for Patient FHIR resources
 */
export class PatientFhirConverter extends BaseFhirConverter<
  PatientModel,
  FHIRPatient
> {
  private readonly addressConverter = new AddressFhirConverter();

  private static readonly CHF_ID_SYSTEM = "http://hospital.smarthealthit.org";
  private static readonly OPENIMIS_ID_SYSTEM =
    "https://openimis.org/fhir/patient-identifier";

  fromFhir(fhirPatient: FHIRPatient): PatientModel {
    try {
      const chfId =
        this.findIdentifierBySystem(
          fhirPatient.identifier || [],
          PatientFhirConverter.CHF_ID_SYSTEM,
        ) ||
        this.findIdentifierBySystem(
          fhirPatient.identifier || [],
          PatientFhirConverter.OPENIMIS_ID_SYSTEM,
        ) ||
        "";

      const primaryName = fhirPatient.name?.[0];
      const lastName = primaryName?.family || "";
      const otherNames = primaryName?.given?.join(" ") || "";

      const addresses =
        fhirPatient.address?.map((addr) =>
          this.addressConverter.fromFhir(addr),
        ) || [];

      const photo = fhirPatient.photo?.[0]?.data || fhirPatient.photo?.[0]?.url;

      const patient = new PatientModel({
        chfId,
        lastName,
        otherNames,
        gender: fhirPatient.gender || "unknown",
        birthDate: fhirPatient.birthDate || "",
        photo,
        addresses: addresses.length > 0 ? addresses : undefined,
      });

      if (!patient.isValid()) {
        throw new ValidationError(
          "Invalid patient data after FHIR conversion",
          {
            fhirPatient,
            convertedPatient: patient,
          },
        );
      }

      return patient;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        "Failed to convert FHIR Patient to domain model",
        {
          fhirPatient,
          originalError: error,
        },
      );
    }
  }

  toFhir(patient: PatientModel): FHIRPatient {
    if (!patient.isValid()) {
      throw new ValidationError("Invalid patient data for FHIR conversion", {
        patient,
      });
    }

    return {
      id: patient.chfId,
      identifier: [
        {
          system: PatientFhirConverter.CHF_ID_SYSTEM,
          value: patient.chfId,
          use: "usual",
        },
      ],
      active: true,
      name: [
        {
          use: "official",
          family: patient.lastName,
          given: patient.otherNames.split(" ").filter((name) => name.trim()),
        },
      ],
      gender: patient.gender as any,
      birthDate: patient.birthDate,
      address: patient.addresses?.map((addr) =>
        this.addressConverter.toFhir(addr),
      ),
      photo: patient.photo
        ? [
            {
              contentType: "image/jpeg",
              data: patient.photo,
            },
          ]
        : undefined,
    };
  }

  static fromFhir(fhirPatient: FHIRPatient): PatientModel {
    return new PatientFhirConverter().fromFhir(fhirPatient);
  }

  static toFhir(patient: PatientModel): FHIRPatient {
    return new PatientFhirConverter().toFhir(patient);
  }
}

export default PatientFhirConverter;
