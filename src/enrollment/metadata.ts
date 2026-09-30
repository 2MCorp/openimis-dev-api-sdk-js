import HttpClient, { ApiResponse, mapData } from "../types";
import { ENROLLMENT_BASE_PATH } from "./types";
import {
  EnrollmentLocation,
  EnrollmentLegalForm,
} from "../models/enrollment_metadata";

/**
 * Client for enrollment metadata endpoints (locations, legal forms).
 */
class EnrollmentMetadataClient {
  constructor(private readonly httpClient: HttpClient) {}

  /**
   * List enrollment locations (regions, districts, municipalities, etc.)
   * GET /enrollment/locations/
   *
   * @param opts - Optional filters
   * @param opts.type - Location type filter (e.g., "R" for region, "D" for district)
   * @param opts.parentId - Filter by parent location ID
   * @returns List of locations
   *
   * @example
   * ```typescript
   * // Get all regions
   * const regions = await sdk.enrollment.metadata.listLocations({ type: 'R' });
   *
   * // Get districts under a specific region
   * const districts = await sdk.enrollment.metadata.listLocations({
   *   type: 'D',
   *   parentId: regionId
   * });
   * ```
   */
  async listLocations(opts?: {
    type?: string;
    parentId?: number;
  }): Promise<ApiResponse<EnrollmentLocation[]>> {
    const params = new URLSearchParams();
    if (opts?.type) params.set("type", opts.type);
    if (opts?.parentId != null) params.set("parent_id", String(opts.parentId));

    const query = params.toString();
    const path = `${ENROLLMENT_BASE_PATH}/locations/${
      query ? `?${query}` : ""
    }`;

    const response = await this.httpClient.get<unknown>(path);
    return mapData(response, (data) => {
      const results = this.extractArray(data, "results");
      return results.map((item) => EnrollmentLocation.fromJSON(item));
    });
  }

  /**
   * List health facility legal forms.
   * GET /enrollment/health-facility-legal-forms/
   *
   * @returns List of legal forms (NGO, Private, Government, etc.)
   *
   * @example
   * ```typescript
   * const legalForms = await sdk.enrollment.metadata.listHealthFacilityLegalForms();
   * // [{ code: 'G', name: 'Government', sortOrder: 1 }, ...]
   * ```
   */
  async listHealthFacilityLegalForms(): Promise<
    ApiResponse<EnrollmentLegalForm[]>
  > {
    const response = await this.httpClient.get<unknown>(
      `${ENROLLMENT_BASE_PATH}/health-facility-legal-forms/`,
    );
    return mapData(response, (data) => {
      const results = this.extractArray(data, "results");
      return results.map((item) => EnrollmentLegalForm.fromJSON(item));
    });
  }

  /**
   * Extract array from API response (handles both direct arrays and DRF paginated results).
   */
  private extractArray(data: unknown, key: string): Record<string, unknown>[] {
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    if (data && typeof data === "object" && key in data) {
      const nested = (data as Record<string, unknown>)[key];
      if (Array.isArray(nested)) return nested as Record<string, unknown>[];
    }
    return [];
  }
}

export default EnrollmentMetadataClient;
