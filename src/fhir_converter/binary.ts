/// <reference types="fhir" />

import { BinaryModel } from "../models/binary";
import BaseFhirConverter from "./base";
import { assertResourceType } from "./helpers";

class BinaryFhirConverter extends BaseFhirConverter<BinaryModel, fhir4.Binary> {
  readonly resourceType = "Binary";

  fromFhir(resource: fhir4.Binary): BinaryModel {
    assertResourceType(resource, "Binary");
    return new BinaryModel(resource.contentType, resource.data ?? "");
  }

  toFhir(model: BinaryModel): fhir4.Binary {
    return {
      resourceType: "Binary",
      contentType: model.contentType,
      data: model.data,
    };
  }
}

export default BinaryFhirConverter;
