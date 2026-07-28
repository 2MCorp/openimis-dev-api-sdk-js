# OpenIMIS Developer API SDK (JS/TS)

TypeScript/JavaScript client for the [OpenIMIS Developer API](https://github.com/2MCorp/openimis-be-developer_api_py).

The SDK wraps FHIR-backed plugin endpoints and returns UI-friendly model classes. It covers authentication, health facility workflows, formal-sector (policy holder) operations, dashboard KPIs, and FHIR ↔ model conversion.

## Requirements

- Node.js 18+ (uses native `fetch`)
- TypeScript 5+ recommended (types ship with the package)

## Install

Install from GitHub (this package is not published to the npm registry). A `prepare` script compiles TypeScript on install:

```bash
pnpm add github:2MCorp/openimis-dev-api-sdk-js
# or: npm install github:2MCorp/openimis-dev-api-sdk-js
# or: yarn add github:2MCorp/openimis-dev-api-sdk-js
```

SSH (private clones / org access):

```bash
pnpm add git+ssh://git@github.com/2MCorp/openimis-dev-api-sdk-js.git
```

Pin a branch, tag, or commit:

```bash
pnpm add github:2MCorp/openimis-dev-api-sdk-js#main
pnpm add github:2MCorp/openimis-dev-api-sdk-js#v1.0.0
```

## Quick start

```ts
import OpenIMISDevApiSdk, {
  HttpClient,
  LoginCredentials,
} from "openimis-dev-api-sdk-js";

const http = new HttpClient("https://your-openimis-host");
const sdk = new OpenIMISDevApiSdk(http);

// Staff / interactive user login (Knox Token; persisted on HttpClient by default)
await sdk.auth.userAuth.login(
  new LoginCredentials("username", "password")
);

const user = await sdk.auth.userAuth.getUser();
console.log(user);
```

### With an existing token or API key

```ts
const http = new HttpClient("https://your-openimis-host", {
  token: process.env.OPENIMIS_TOKEN,
  authScheme: "Token", // "Token" | "Bearer" | "Api-Key"
  policyHolderCode: "PH001", // multi-org policy-holder users
});

const sdk = new OpenIMISDevApiSdk(http);
```

## Architecture

```
OpenIMISDevApiSdk
├── auth              Authentication (user + insuree)
├── healthFacility    /health-facility-dev-api/
├── formalSector      /policy-holder-dev-api/
├── dashboard         /dashboard/ (metrics + analytics)
└── fhir              FHIR ↔ model converters
```

Create one `HttpClient` per base URL/session and pass it into `OpenIMISDevApiSdk`. Auth helpers can persist tokens on that client; you can also set them manually:

```ts
http.setToken("…");
http.setAuthScheme("Api-Key");
http.setPolicyHolderCode("PH001");
```

## Authentication (`sdk.auth`)

### User auth — `/authentication/user-auth`

| Method | Description |
| --- | --- |
| `login(credentials)` | Login; optionally persist Knox token |
| `logout()` / `logoutAll()` | End session(s) and clear token |
| `getUser()` | Current user profile |
| `requestPasswordReset` / `verifyPasswordResetOtp` / `confirmPasswordReset` | Password reset flow |
| `refreshToken()` | Refresh when backend has `refresh_token: true` |

```ts
import { LoginCredentials } from "openimis-dev-api-sdk-js";

await sdk.auth.userAuth.login(
  new LoginCredentials("officer", "secret"),
  { persistToken: true }
);
```

### Insuree auth — `/authentication/insuree-auth`

| Method | Description |
| --- | --- |
| `login(credentials)` | Insuree login |
| `register(request)` | Register insuree account |
| `verify(request)` | Verify after register → login |
| `getInfo()` | Insuree profile |
| `clearSession()` | Clear token locally |

## Health facility (`sdk.healthFacility`)

Base path: `/health-facility-dev-api/`. Responses are mapped from FHIR into models via built-in converters.

| Client | Key operations |
| --- | --- |
| `patients` | Public patient lookup by CHF ID or identifier |
| `encounters` | List / get / create / update / patch / bulk submit |
| `claims` | List / get / update / patch / submit |
| `claimItems` | CRUD for claim items (ChargeItem) |
| `claimServices` | CRUD for claim services (ChargeItem) |
| `claimAttachments` | CRUD for claim attachments (DocumentReference) |
| `preauthorizations` | List / get / create / update |
| `medications` | List medications |
| `services` | List medical services |
| `diagnoses` | List / get diagnoses |
| `facilities` | Search by code or name |
| `patientReferences` | List patient references |

```ts
const patient = await sdk.healthFacility.patients.getByChfId("070000001");

const page = await sdk.healthFacility.encounters.list(/* filters */);
const encounter = await sdk.healthFacility.encounters.create(claimModel);
```

## Formal sector / policy holder (`sdk.formalSector`)

Base path: `/policy-holder-dev-api/`. For multi-org users, set `PolicyHolder-Code` on the `HttpClient` before calling.

| Client | Key operations |
| --- | --- |
| `searchEmployees` | Public employee lookup by CHF ID or identifier |
| `employees` | List / get / create / binary upload / batch upload |
| `groups` | Get group by employee UUID |
| `contracts` | List / get / create |
| `insurancePlans` | List / get |
| `payments` | List / get |
| `staffs` | List / get |
| `employeeClaims` | List / get |

```ts
http.setPolicyHolderCode("PH001");

const employees = await sdk.formalSector.employees.list();
const created = await sdk.formalSector.employees.create(employeeModel);
```

## Dashboard (`sdk.dashboard`)

Base path: `/dashboard/`. Returns plain JSON KPI payloads (not FHIR).

| Client | Endpoints |
| --- | --- |
| `metrics` | `policyHolder`, `healthFacility`, `system` |
| `analytics` | `policyHolder`, `healthFacility`, `system` |

Auth depends on the endpoint (Knox token, policy-holder/health-facility API key, or system API key). System metrics require `authScheme: "Api-Key"`.

```ts
import { DashboardQueryParams } from "openimis-dev-api-sdk-js";

const metrics = await sdk.dashboard.metrics.policyHolder(
  new DashboardQueryParams({ /* optional date range, etc. */ })
);
```

## FHIR converter (`sdk.fhir`)

Converts FHIR R4 resources ↔ SDK model classes without making HTTP calls. Useful when you already have FHIR JSON or need to build request payloads.

Supported converters include: patient, employee, claim, preauthorization, health facility, location, medication, medical service, diagnosis, contract, groups, insurance plan, payments, coverage, staff, binary.

```ts
const model = sdk.fhir.patient.fromFhir(patientResource);
const fhir = sdk.fhir.patient.toFhir(model);

const models = sdk.fhir.claimsFromBundle(bundle);
const any = sdk.fhir.fromUnknownResource(resource); // dispatches by resourceType
```

## Models & errors

Domain models (`PatientModel`, `ClaimModel`, `EmployeeModel`, …) and auth/dashboard types are exported from the package root.

Failed HTTP responses throw `ApiError`:

```ts
import { ApiError } from "openimis-dev-api-sdk-js";

try {
  await sdk.healthFacility.claims.get("unknown");
} catch (err) {
  if (err instanceof ApiError) {
    console.error(err.status, err.body, err.message);
  }
  throw err;
}
```

## Development

```bash
pnpm install
pnpm run typecheck
pnpm run build    # emits dist/ (JS + .d.ts)
```

| Script | Description |
| --- | --- |
| `clean` | Remove `dist/` |
| `build` | Clean + compile TypeScript |
| `typecheck` | Type-check without emit |
| `pack` | Build and create a tarball |

## License

[ISC](./LICENSE)
