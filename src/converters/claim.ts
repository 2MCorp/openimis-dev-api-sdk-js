import { BaseFhirClientConverter } from ".";
import { ClaimModel } from "../models/claim";
import { Claim } from "fhir_resources_ts/src/r5/"


export class ClaimFhirConverter extends BaseFhirClientConverter {
    fromFhir(fhirClaim: any): ClaimModel {

        const fhirModel = new Claim(fhirClaim as Claim);
        const model = new ClaimModel({
            id: fhirModel.id || "",
            status: fhirModel.status,
            type: fhirModel.type?.coding?.[0]?.code || "",
            patient: {
                chfid: fhirModel.patient?.display as string || ""
            },
            total: {
                amount: fhirModel.total?.value || "",
                currency: fhirModel.total?.currency || ""
            },
            createdAt: fhirClaim?.billablePeriod?.start || "",
            endedAt: fhirClaim?.billablePeriod?.end || "",
            priority: fhirModel.priority?.coding?.[0]?.code,
            code: fhirModel.identifier?.[1]?.value || "",
            diagnosis: fhirModel.diagnosis?.map((diag: any) => ({
                id: diag.id,
                code: diag.diagnosisCodeableConcept?.coding?.[0]?.code,
                name: diag.diagnosisCodeableConcept?.coding?.[0]?.display
            })) || [],
            documents: fhirModel.supportingInfo?.map((info: any) => ({
                id: info.id,
                createdAt: info.created
            })) || [],
            items: fhirModel.item?.map((item: any) => ({
                id: item.extension?.[0]?.valueReference?.identifier?.value || "",
                name: item.extension?.[0]?.valueReference?.display.split(" ").slice(1).join(" ") || "",
                code: item.extension?.[0]?.valueReference?.display.split(" ")[0] || "",
                price: item.unitPrice?.value || "",
                currency: item.unitPrice?.currency || "",
                quantity: item.quantity?.value || 0
            })) || []
        });

        return model;
    }

    toFhir(claim: any): any {
        return JSON.stringify(claim);
    }
}