# Developer API FHIR Client SDK

A comprehensive TypeScript SDK for OpenIMIS Developer API FHIR endpoints. Provides authentication, patient/employee management, and policy holder operations with full TypeScript support, error handling, and FHIR R4 compliance.

## Features

- **Authentication Management** - Secure token-based authentication
- **Policy Holder Operations** - Search and manage policy holders, employees, and patients
- **FHIR R4 Compliance** - Full support for FHIR R4 standard
- **Data Conversion** - Seamless conversion between FHIR and domain models
- **Error Handling** - Comprehensive error classes and validation
- **HTTP Client** - Advanced HTTP client with retry logic and timeout handling
- **TypeScript First** - Full TypeScript support with strict typing
- **Testing Ready** - Comprehensive test suite with Jest
- **Well Documented** - Complete API documentation and examples

## Installation

```bash
npm install developer_api_fhir_client_js
```

## Quick Start

### Basic Usage

```typescript
import { DeveloperAPISDK } from "developer_api_fhir_client_js";

// Initialize the SDK
const sdk = new DeveloperAPISDK({
  baseUrl: "https://api.openimis.org/api/v1",
});

// Authenticate and get token
const authResult = await sdk.auth.login("username", "password");
if (authResult.success) {
  // Set token for all subsequent requests
  sdk.setAuthToken(authResult.data.access_token);

  // Search for an employee
  const employee = await sdk.policyHolder.searchEmployee("CHF12345");
  console.log(employee);
}
```

### Individual Module Usage

```typescript
import {
  UserAuthDeveloperAPISDK,
  PolicyHolderSDK,
  PatientFhirConverter,
} from "developer_api_fhir_client_js";

// Authentication only
const auth = new UserAuthDeveloperAPISDK("https://api.openimis.org/api/v1");
const loginResult = await auth.login("username", "password");

// Policy holder operations
const policyHolder = new PolicyHolderSDK({
  baseUrl: "https://api.openimis.org/api/v1/policyholder",
  authToken: "your-auth-token",
});

const searchResult = await policyHolder.searchEmployee("CHF12345");
```

### Legacy Compatibility

```typescript
// For backward compatibility with existing code
import PolicyHolderDevFhirSDK, {
  UserAuthDeveloperAPISDK,
} from "developer_api_fhir_client_js";

const auth = new UserAuthDeveloperAPISDK("https://api.openimis.org");
const policyHolder = new PolicyHolderDevFhirSDK(
  "auth-token",
  "https://api.openimis.org",
  "/policyholder"
);
```

## API Reference

### DeveloperAPISDK

Main SDK class providing unified access to all functionality.

#### Constructor

```typescript
const sdk = new DeveloperAPISDK(config: DeveloperAPISDKConfig);
```

**DeveloperAPISDKConfig:**

- `baseUrl` (string): Base URL for the API
- `timeout?` (number): Request timeout in milliseconds (default: 30000)
- `retries?` (number): Number of retry attempts (default: 3)
- `apiVersion?` (string): API version (default: 'v1')

#### Methods

##### `setAuthToken(token: string): void`

Set authentication token for all modules.

##### `static getVersion(): string`

Get SDK version information.

##### `static getInfo(): object`

Get comprehensive SDK information.

### Authentication Module

#### UserAuthDeveloperAPISDK

Handles authentication operations.

##### `login(username: string, password: string): Promise<APIResponse<AuthResponse>>`

Authenticate user and get access token.

**Parameters:**

- `username` (string): User's login name
- `password` (string): User's password

**Returns:** Promise resolving to authentication response with token information.

**Example:**

```typescript
const authResult = await sdk.auth.login("johndoe", "password123");
if (authResult.success) {
  console.log("Access Token:", authResult.data.access_token);
  console.log("Expires In:", authResult.data.expires_in);
}
```

### Policy Holder Module

#### PolicyHolderSDK

Comprehensive policy holder operations with advanced search capabilities.

##### `searchEmployee(chfId: string): Promise<APIResponse<EmployeeModel | null>>`

Search for employee by CHF ID.

**Parameters:**

- `chfId` (string): Employee's CHF identifier

**Returns:** Promise resolving to employee data or null if not found.

##### `searchPatient(chfId: string): Promise<APIResponse<PatientModel | null>>`

Search for patient by CHF ID.

**Parameters:**

- `chfId` (string): Patient's CHF identifier

**Returns:** Promise resolving to patient data or null if not found.

##### `searchPolicyHolders(params: PolicyHolderSearchParams): Promise<PaginatedResponse<PolicyHolderSearchResult>>`

Advanced search for policy holders with pagination.

**PolicyHolderSearchParams:**

- `chfId?` (string): CHF identifier to search for
- `name?` (string): Name to search for
- `limit?` (number): Maximum results per page (1-100)
- `offset?` (number): Number of records to skip

**Example:**

```typescript
const searchResult = await sdk.policyHolder.searchPolicyHolders({
  name: "John",
  limit: 20,
  offset: 0,
});

if (searchResult.success) {
  console.log("Total found:", searchResult.pagination.total);
  console.log("Employees:", searchResult.data[0].employees);
  console.log("Patients:", searchResult.data[0].patients);
}
```

## Data Models

### EmployeeModel

```typescript
interface EmployeeModel {
  id: string;
  chfId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "M" | "F" | "O";
  email?: string;
  phone?: string;
  address?: AddressModel;
  employmentStatus: string;
  position?: string;
  salary?: number;
  hireDate?: string;
}
```

### PatientModel

```typescript
interface PatientModel {
  id: string;
  chfId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "M" | "F" | "O";
  email?: string;
  phone?: string;
  address?: AddressModel;
  maritalStatus?: string;
  nationality?: string;
  emergencyContact?: ContactModel;
}
```

### AddressModel

```typescript
interface AddressModel {
  line1: string;
  line2?: string;
  city: string;
  district: string;
  state: string;
  postalCode?: string;
  country: string;
}
```

## Error Handling

The SDK provides comprehensive error handling with specific error types:

### Error Types

- **`SDKError`**: Base error class for all SDK errors
- **`AuthenticationError`**: Authentication-related errors
- **`ValidationError`**: Input validation errors
- **`NetworkError`**: Network and HTTP-related errors
- **`TimeoutError`**: Request timeout errors
- **`RateLimitError`**: API rate limit errors

### Error Handling Examples

```typescript
try {
  const result = await sdk.policyHolder.searchEmployee("CHF12345");
  console.log(result);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error("Authentication failed:", error.message);
    // Handle authentication error
  } else if (error instanceof ValidationError) {
    console.error("Validation error:", error.message);
    console.error("Invalid data:", error.context);
  } else if (error instanceof NetworkError) {
    console.error("Network error:", error.message);
    console.error("Status code:", error.statusCode);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## Development

### Building

```bash
# Build the library
npm run build

# Build and watch for changes
npm run build:watch

# Clean build artifacts
npm run clean
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Linting

```bash
# Check for TypeScript errors
npm run lint

# Fix TypeScript errors (where possible)
npm run lint:fix
```

## License

This project is licensed under the MIT License.

## Support

For issues, questions, or contributions, please visit our [GitHub repository](https://github.com/2MCorp/developer_api_fhir_client_js) or contact the development team.

---

Made with by [2MCorp](https://github.com/2MCorp)
