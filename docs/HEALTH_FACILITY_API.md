# Health Facility Portal SDK API Reference

Complete reference for SDK methods used by the Health Facility Portal frontend.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Health Facility Staff Management](#health-facility-staff-management)
3. [Enrollment](#enrollment)
4. [Bulk Operations](#bulk-operations)
5. [Claims & Encounters](#claims--encounters)
6. [Error Handling](#error-handling)

---

## Authentication

### `sdk.auth.userAuth`

#### `register(payload)`
Register a new portal user account.

**Parameters:**
```typescript
{
  username: string;
  email: string;
  password: string;
}
```

**Returns:** `ApiResponse<RegisterPortalUserResponse>`

**Example:**
```typescript
const result = await sdk.auth.userAuth.register({
  username: 'facility_admin',
  email: 'admin@facility.example',
  password: 'SecurePass123!'
});

if (result.success) {
  // Registration successful - user must verify email before login
  console.log('Check your email for verification code');
}
```

**Notes:**
- Does NOT persist a token (user must login after email verification)
- Requires email verification before account is activated
- Password must meet backend validation rules

---

#### `verify(payload)`
Verify email address with OTP code.

**Parameters:**
```typescript
{
  email: string;
  otp: string;
}
```

**Returns:** `ApiResponse<VerifyPortalEmailResponse>`

**Example:**
```typescript
const result = await sdk.auth.userAuth.verify({
  email: 'admin@facility.example',
  otp: '123456'
});

if (result.success) {
  // Email verified - user can now login
}
```

---

#### `resendVerify(payload)`
Resend email verification OTP.

**Parameters:**
```typescript
{
  email: string;
}
```

**Returns:** `ApiResponse<ResendPortalVerificationResponse>`

**Example:**
```typescript
await sdk.auth.userAuth.resendVerify({
  email: 'admin@facility.example'
});
```

---

#### `login(credentials, options?)`
Login with username/password and obtain Knox token.

**Parameters:**
```typescript
credentials: LoginCredentials;
options?: { persistToken?: boolean };  // default: true
```

**Returns:** `ApiResponse<AuthTokenResponse>`

**Example:**
```typescript
import { LoginCredentials } from 'openimis-dev-api-sdk-js';

const result = await sdk.auth.userAuth.login(
  new LoginCredentials('facility_admin', 'password'),
  { persistToken: true }  // Token saved on HttpClient automatically
);

if (result.success && result.data) {
  const token = result.data.token;
  const expiry = result.data.expiry;
}
```

**Notes:**
- When `persistToken: true`, token is automatically set on HttpClient
- Subsequent SDK calls will use this token
- Token expires after configured duration (backend setting)

---

#### `getUser()`
Get current authenticated user profile.

**Returns:** `ApiResponse<UserInfo>`

**Response includes:**
- `id`, `username`, `email`
- `lastName`, `otherNames`
- `permissions: string[]` - User permissions
- `emailVerified: boolean`
- `healthFacility: { id, code, name }` - Associated facility
- `language` - User's preferred language

**Example:**
```typescript
const userResp = await sdk.auth.userAuth.getUser();
if (userResp.success && userResp.data) {
  const user = userResp.data;
  console.log(`Welcome, ${user.otherNames} ${user.lastName}`);
  console.log(`Facility: ${user.healthFacility?.name}`);
  console.log(`Permissions: ${user.permissions.join(', ')}`);
}
```

---

#### `logout()` / `logoutAll()`
End current session or all sessions.

**Returns:** `ApiResponse<null>`

**Example:**
```typescript
await sdk.auth.userAuth.logout();      // End this session
await sdk.auth.userAuth.logoutAll();   // End all user sessions
```

**Notes:**
- Clears token from HttpClient automatically
- Backend invalidates the Knox token

---

## Health Facility Staff Management

### `sdk.healthFacility.staffs`

#### `list(params?)`
List all staff members at the health facility.

**Parameters:**
```typescript
params?: FhirListParams;  // Pagination params (page, count)
```

**Returns:** `ApiResponse<FhirSearchPage<HfStaffModel>>`

**Response:** Paginated list of staff with:
- `id` - Staff ID
- `username` - Login username
- `displayName` - Full name
- `email` - Contact email
- `role` - Staff role ('ADMIN' | 'STAFF')
- `active` - Whether account is active

**Example:**
```typescript
const result = await sdk.healthFacility.staffs.list();
if (result.success && result.data) {
  result.data.items.forEach(staff => {
    console.log(`${staff.displayName} (${staff.role})`);
  });
}
```

---

#### `get(id)`
Get single staff member by ID.

**Parameters:**
```typescript
id: string;  // Staff ID
```

**Returns:** `ApiResponse<HfStaffModel>`

**Example:**
```typescript
const result = await sdk.healthFacility.staffs.get('staff-uuid-123');
if (result.success && result.data) {
  const staff = result.data;
  console.log(`${staff.displayName} - ${staff.email}`);
}
```

---

#### `create(payload)`
Create a new staff member.

**Parameters:**
```typescript
{
  username: string;
  email: string;
  password: string;
  other_names?: string;
  last_name?: string;
  role?: 'ADMIN' | 'STAFF';  // default: 'STAFF'
}
```

**Returns:** `ApiResponse<HfStaffModel>`

**Example:**
```typescript
const result = await sdk.healthFacility.staffs.create({
  username: 'nurse_jane',
  email: 'jane@facility.example',
  password: 'InitialPass123!',
  other_names: 'Jane',
  last_name: 'Doe',
  role: 'STAFF'
});

if (result.success && result.data) {
  console.log(`Created staff: ${result.data.displayName}`);
}
```

**Notes:**
- Only HF admins can create staff
- Password must meet backend validation rules
- Staff will be associated with the admin's facility

---

#### `update(id, payload)`
Update staff member (role change, deactivation).

**Parameters:**
```typescript
id: string;
payload: {
  role?: 'ADMIN' | 'STAFF';
  active?: boolean;
  password?: string;  // Reset password
}
```

**Returns:** `ApiResponse<HfStaffModel>`

**Example:**
```typescript
// Promote to admin
await sdk.healthFacility.staffs.update('staff-uuid', {
  role: 'ADMIN'
});

// Deactivate account
await sdk.healthFacility.staffs.update('staff-uuid', {
  active: false
});
```

---

## Enrollment

### `sdk.enrollment.healthFacility`

#### `register(payload)`
Create a new health facility registration application.

**Parameters:**
```typescript
{
  facility_data: {
    code: string;
    name: string;
    legal_form: string;  // From listHealthFacilityLegalForms()
    level: string;
    address?: string;
    phone?: string;
    email?: string;
    location_id?: number;  // From listLocations()
  };
  notes?: string;
  submitted_by_type: 'SELF';
  self_enrollemnt_type: 'HEALTH_FACILITY';
}
```

**Returns:** `ApiResponse<EnrollmentRecord>`

**Example:**
```typescript
const result = await sdk.enrollment.healthFacility.register({
  facility_data: {
    code: 'FAC001',
    name: 'Community Health Center',
    legal_form: 'P',  // Private
    level: 'H',  // Health center
    address: '123 Main St',
    phone: '+2341234567',
    email: 'contact@facility.example',
    location_id: 42  // District ID
  },
  notes: 'New facility opening in Q1',
  submitted_by_type: 'SELF',
  self_enrollemnt_type: 'HEALTH_FACILITY'
});

if (result.success && result.data) {
  const uuid = result.data.uuid;
  // Must call submit() to finalize
}
```

---

#### `submit(uuid)`
Submit a registration application for review.

**Parameters:**
```typescript
uuid: string;  // Registration UUID from register()
```

**Returns:** `ApiResponse<EnrollmentActionResult>`

**Example:**
```typescript
await sdk.enrollment.healthFacility.submit(registrationUuid);
// Application now pending approval
```

---

#### `listRegistrations()`
List all registration applications for the current user.

**Returns:** `ApiResponse<EnrollmentListResult>`

**Example:**
```typescript
const result = await sdk.enrollment.healthFacility.listRegistrations();
if (result.success && result.data) {
  result.data.results.forEach(reg => {
    console.log(`${reg.uuid}: ${reg.status}`);
  });
}
```

---

#### `accountClaim(payload)`
Claim an existing facility account.

**Parameters:**
```typescript
{
  facility_code: string;
  notes?: string;
  auto_submit?: boolean;  // default: true
}
```

**Returns:** `ApiResponse<EnrollmentActionResult>`

**Example:**
```typescript
const result = await sdk.enrollment.healthFacility.accountClaim({
  facility_code: 'FAC001',
  notes: 'I am the new facility administrator',
  auto_submit: true
});
```

**Notes:**
- Use this when a facility already exists in OpenIMIS
- Requires admin approval
- When `auto_submit: true`, application is immediately submitted

---

#### `listAccountClaims()`
List all account claim applications.

**Returns:** `ApiResponse<EnrollmentListResult>`

---

### `sdk.enrollment.metadata`

#### `listLocations(opts?)`
List enrollment locations (regions, districts, municipalities).

**Parameters:**
```typescript
opts?: {
  type?: string;      // 'R' (region), 'D' (district), etc.
  parentId?: number;  // Filter by parent location
}
```

**Returns:** `ApiResponse<EnrollmentLocation[]>`

**Response:**
```typescript
{
  id: number;
  uuid: string;
  code: string;
  name: string;
  type: string;        // 'R', 'D', 'M', etc.
  parentId: number | null;
}
```

**Example:**
```typescript
// Get all regions
const regions = await sdk.enrollment.metadata.listLocations({ type: 'R' });

// Get districts under a specific region
const districts = await sdk.enrollment.metadata.listLocations({
  type: 'D',
  parentId: regionId
});
```

---

#### `listHealthFacilityLegalForms()`
List health facility legal form types.

**Returns:** `ApiResponse<EnrollmentLegalForm[]>`

**Response:**
```typescript
{
  code: string;        // 'G', 'P', 'NGO', etc.
  name: string;        // 'Government', 'Private', 'NGO'
  sortOrder: number | null;
}
```

**Example:**
```typescript
const forms = await sdk.enrollment.metadata.listHealthFacilityLegalForms();
// Use in registration forms
```

---

## Bulk Operations

### `sdk.healthFacility.bulk`

#### `uploadEncountersCsv(file, filename?)`
Upload bulk encounters/claims via CSV file.

**Parameters:**
```typescript
file: File | Blob;
filename?: string;  // default: 'bulk.csv'
```

**Returns:** `ApiResponse<BulkEncounterResult>`

**Response:**
```typescript
{
  message: string;
  totalRows: number;
  successful: number;
  failed: number;
  results: Array<{
    row: number;
    success: boolean;
    message: string;
    claimId?: string | number;
  }>;
}
```

**CSV Format:**
```csv
patient_chfid,date_from,diagnosis,service_code,quantity,unit_price
123456789,2024-01-01,A00,D1,1,100.00
987654321,2024-01-02,B01,S2,2,50.00
```

**Example:**
```typescript
const csv = generateCsvContent();
const blob = new Blob([csv], { type: 'text/csv' });
const result = await sdk.healthFacility.bulk.uploadEncountersCsv(blob, 'jan_claims.csv');

if (result.success && result.data) {
  console.log(`${result.data.successful}/${result.data.totalRows} succeeded`);
  
  // Show errors
  result.data.results.forEach(row => {
    if (!row.success) {
      console.error(`Row ${row.row}: ${row.message}`);
    }
  });
}
```

**Notes:**
- Validation happens per-row
- Some rows may succeed while others fail
- Check `results` array for per-row status

---

## Claims & Encounters

### `sdk.healthFacility.claims`

#### `list(filters)`
List claims/encounters with filters.

**Parameters:**
```typescript
filters: ClaimListFilters;
```

**Returns:** `ApiResponse<FhirSearchPage<ClaimModel>>`

**Example:**
```typescript
import { ClaimListFilters } from 'openimis-dev-api-sdk-js';

const filters = new ClaimListFilters(
  1,                    // page
  20,                   // count per page
  undefined,            // identifier
  '2024-01-01',         // date from
  'patient-uuid',       // patient
  undefined,            // patient CHFID
  'ENTERED'             // status
);

const result = await sdk.healthFacility.claims.list(filters);
```

---

## Error Handling

All SDK methods return `ApiResponse<T>`:

```typescript
interface ApiResponse<T> {
  success: boolean;
  statusCode: string | number;
  message: string;
  data: T | null;
  errorDetails?: string[];
}
```

### Standard Error Handling Pattern

```typescript
const result = await sdk.healthFacility.staffs.create(payload);

if (!result.success) {
  // Handle error
  console.error(`Error ${result.statusCode}: ${result.message}`);
  
  if (result.errorDetails) {
    result.errorDetails.forEach(detail => console.error(detail));
  }
  
  return;
}

// Success - data is guaranteed to exist
const staff = result.data!;
console.log(`Created: ${staff.displayName}`);
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Server Error |

---

## Best Practices

### 1. Always Check Success
```typescript
const result = await sdk.auth.userAuth.getUser();
if (result.success && result.data) {
  // Safe to use result.data
}
```

### 2. Handle Errors Gracefully
```typescript
try {
  const result = await sdk.healthFacility.staffs.create(payload);
  if (!result.success) {
    // Show user-friendly error
    showError(result.message);
    return;
  }
} catch (error) {
  // Network/unexpected error
  showError('Connection failed. Please try again.');
}
```

### 3. Token Management
```typescript
// Login once, reuse SDK instance
const sdk = createSdk();
await sdk.auth.userAuth.login(credentials, { persistToken: true });

// All subsequent calls use the persisted token
await sdk.healthFacility.claims.list(filters);
await sdk.healthFacility.staffs.list();
```

### 4. Pagination
```typescript
import { FhirListParams } from 'openimis-dev-api-sdk-js';

const params = new FhirListParams(1, 50);  // page 1, 50 items
const result = await sdk.healthFacility.staffs.list(params);

if (result.success && result.data) {
  console.log(`Total: ${result.data.total}`);
  console.log(`Page: ${result.data.page}`);
  // result.data.items contains the staff list
}
```

---

## TypeScript Support

All SDK methods are fully typed. Enable strict mode in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

Import types:
```typescript
import {
  HfStaffModel,
  ClaimModel,
  EnrollmentLocation,
  BulkEncounterResult,
  ApiResponse
} from 'openimis-dev-api-sdk-js';
```

---

**Last Updated:** 2026-08-08  
**SDK Version:** 1.0.0+  
**Backend:** OpenIMIS Developer API
