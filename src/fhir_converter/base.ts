/// <reference types="fhir" />

import { FhirSearchPage } from "../models/pagination";
import { parseSearchBundle, resourcesFromBundle } from "./helpers";

export default abstract class BaseFhirConverter<TModel, TResource extends fhir4.FhirResource> {
  abstract readonly resourceType: string;

  abstract fromFhir(resource: TResource): TModel;
  abstract toFhir(model: TModel): TResource;

  fromBundle(bundle: fhir4.Bundle): TModel[] {
    return resourcesFromBundle<TResource>(bundle, this.resourceType).map(
      (resource) => this.fromFhir(resource)
    );
  }

  fromSearchBundle(bundle: fhir4.Bundle): FhirSearchPage<TModel> {
    const page = parseSearchBundle(bundle, (resource) => {
      if (resource.resourceType !== this.resourceType) {
        throw new Error(
          `Unexpected resourceType "${resource.resourceType}" in ${this.resourceType} search bundle`
        );
      }
      return this.fromFhir(resource as TResource);
    });
    return new FhirSearchPage(
      page.total,
      page.items,
      page.selfUrl,
      page.nextUrl,
      page.previousUrl
    );
  }

  toCollectionBundle(models: TModel[]): fhir4.Bundle {
    return {
      resourceType: "Bundle",
      type: "collection",
      entry: models.map((model) => ({
        resource: this.toFhir(model),
      })),
    };
  }
}
