/// <reference types="fhir" />

import { DiagnosisModel } from "../models/diagnosis";
import {
  assertResourceType,
  resourcesFromBundle,
} from "./helpers";

class DiagnosisFhirConverter {
  readonly resourceType = "CodeSystem";

  fromFhir(resource: fhir4.CodeSystem): DiagnosisModel[] {
    assertResourceType(resource, "CodeSystem");
    if (resource.concept?.length) {
      return resource.concept.map(
        (concept) =>
          new DiagnosisModel(
            concept.code ?? "",
            concept.display ?? concept.definition ?? "",
            resource.id
          )
      );
    }
    const [code, name] = (resource.name ?? resource.title ?? "").split(" - ");
    return [new DiagnosisModel(code ?? "", name ?? resource.title ?? "", resource.id)];
  }

  fromBundle(bundle: fhir4.Bundle): DiagnosisModel[] {
    return resourcesFromBundle<fhir4.CodeSystem>(bundle, "CodeSystem").flatMap(
      (resource) => this.fromFhir(resource)
    );
  }

  toFhir(model: DiagnosisModel): fhir4.CodeSystem {
    return {
      resourceType: "CodeSystem",
      id: model.id ?? model.code,
      status: "active",
      content: "complete",
      name: `${model.code} - ${model.name}`,
      title: `${model.code} - ${model.name}`,
      concept: [
        {
          code: model.code,
          display: model.name,
          definition: model.name,
        },
      ],
    };
  }
}

export default DiagnosisFhirConverter;
