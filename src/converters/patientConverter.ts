import { BaseFhirClientConverter } from ".";
import { Patient } from "fhir_resources_ts/src/r5/patient"
import { PatientModel } from "../models/patient";
import { GroupModel } from "../models/group";

export class PatientFhirConverter extends BaseFhirClientConverter {
    fromFhir(fhirPatient: any): any {
        const fhirPatientInstance = new Patient(fhirPatient as Patient);
        fhirPatientInstance.identifier = fhirPatient.identifier;

        const patient = new PatientModel({
            lastName: String(fhirPatientInstance.name?.[0]?.family || ""),
            firstName: String(fhirPatientInstance.name?.[0]?.given?.[0] || ""),
            chfId: String(fhirPatientInstance.identifier?.[1]?.value || ""),
            uuid: String(fhirPatientInstance.identifier?.[0]?.value || ""),
            isHead: Boolean(fhirPatientInstance.extension?.[0]?.valueBoolean || false),
            hasCardIssued: Boolean(fhirPatientInstance.extension?.[1]?.valueBoolean || false),
            family: new GroupModel({
                uuid: String(fhirPatientInstance.extension?.[2]?.valueReference?.identifier?.value || ""),
                name: String(fhirPatientInstance.extension?.[2]?.valueReference?.display || "")
            }),
            contained: fhirPatientInstance.contained

        });
        return patient;
    }

    toFhir(patient: any): any {
        return ""
    }
}