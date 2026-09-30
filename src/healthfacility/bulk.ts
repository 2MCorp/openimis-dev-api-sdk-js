import HttpClient, { ApiResponse, mapData } from "../types";
import { HF_BASE_PATH } from "./types";
import { BulkEncounterResult } from "../models/bulk";

/**
 * Client for Health Facility bulk operations.
 */
class HealthFacilityBulkClient {
  constructor(private readonly httpClient: HttpClient) {}

  /**
   * Upload bulk encounters/claims CSV.
   * POST /health-facility-dev-api/bulk-encounters/
   *
   * @param file - CSV file or Blob to upload
   * @param filename - Optional filename (defaults to "bulk.csv")
   * @returns Bulk upload result with per-row success/failure details
   *
   * @example
   * ```typescript
   * const csv = `patient_chfid,date_from,diagnosis,service_code,quantity
   * 123456789,2024-01-01,A00,D1,1`;
   * const blob = new Blob([csv], { type: 'text/csv' });
   * const result = await sdk.healthFacility.bulk.uploadEncountersCsv(blob, 'claims.csv');
   *
   * if (result.success && result.data) {
   *   console.log(`${result.data.successful}/${result.data.totalRows} succeeded`);
   *   result.data.results.forEach(row => {
   *     if (!row.success) {
   *       console.error(`Row ${row.row}: ${row.message}`);
   *     }
   *   });
   * }
   * ```
   */
  async uploadEncountersCsv(
    file: File | Blob,
    filename = "bulk.csv",
  ): Promise<ApiResponse<BulkEncounterResult>> {
    const formData = new FormData();
    formData.append("file", file, filename);

    const response = await this.httpClient.postFormData<unknown>(
      `${HF_BASE_PATH}/bulk-encounters/`,
      formData,
    );

    return mapData(response, (data) =>
      BulkEncounterResult.fromJSON(data as Record<string, unknown>),
    );
  }
}

export default HealthFacilityBulkClient;
