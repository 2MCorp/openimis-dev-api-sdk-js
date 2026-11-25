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
├── eventBus          /event-bus/ (SSE live updates)
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

### Event bus (SSE)

Live HF / PH notifications over Server-Sent Events. Paths and payload parsing live in the SDK so every consumer (portal, Node, mobile) shares the same business logic.

```ts
import {
  OpenIMISDevApiSdk,
  HttpClient,
  parseHfClaimLifecycleData,
  HF_UPDATE_SSE_PATH,
} from "openimis-dev-api-sdk-js";

const http = new HttpClient({ baseUrl: "https://api.example.com/api/developer_api" });
http.setAuthToken(knoxToken);
const sdk = new OpenIMISDevApiSdk(http);

const sub = sdk.eventBus.subscribeHealthFacilityUpdates({
  onNotification: (n) => {
    // n.message, n.claimCode, n.claimId, …
  },
  onError: console.error,
});
// later: sub.close();
```

Browsers that cannot send `Authorization` on `EventSource` should proxy SSE same-origin and still use SDK parsers (`parseHfClaimLifecycleData`, `parseHfMutationData`) and path constants (`HF_UPDATE_SSE_PATH`, …).

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

## Portal common (`openimis-dev-api-sdk-js/portal/*`)

Framework-agnostic logic shared by the health-facility and employer portals (Next.js, SvelteKit or anything else). Nothing here imports a web framework; the apps keep only UI, route handlers and cookie plumbing. The main entry (`.`) does **not** import `jose`, `dexie` or `zod`.

| Subpath | Runs in | Heavy deps | Contents |
|---|---|---|---|
| `openimis-dev-api-sdk-js/portal` | server + browser | zod | re-exports `portal/common` |
| `openimis-dev-api-sdk-js/portal/common` | server + browser | zod | errors, response envelopes, paging, env, SDK factory, backend probe, formatting, money, validation |
| `openimis-dev-api-sdk-js/portal/server` | server / edge | jose | sealed session cookie codec |
| `openimis-dev-api-sdk-js/portal/client` | browser only | dexie | fetch client, IndexedDB cache, SWR controller, offline session, SSE, desktop notifications |
| `openimis-dev-api-sdk-js/portal/healthfacility`, `.../employer` | see their own sections | | app-specific logic |

### `portal/common`

- `toUserFacingApiError(statusCode, rawMessage?)` - safe UI message for an SDK/HTTP failure (HTML, tracebacks and long text are dropped).
- Envelopes (`{ status, body }`, body = `ApiEnvelope<T>` = `{success:true,data} | {success:false,error,fieldErrors?}`): `apiOk(data, status?)`, `apiFail(status, message)`, `sdkFail(resp, fallback?)`, `fromSdkResponse(resp, map, notFoundMessage?)`, `fromBackendResult(result, {status?, notFoundMessage?})`. Route handlers do `NextResponse.json(r.body, { status: r.status })`.
- `BackendResult`, `fromApiResponse(resp)`, `httpStatus(result, fallback?)` - normalised SDK outcome for form handlers.
- Paging/query: `parsePositiveInt(value, fallback, max?)`, `parseFhirPageOffset(value)` (1-based), `pagingFromSearchParams(params, defaultCount?, maxCount?)`, `buildQueryString(params)`.
- Env: `getDeveloperApiBase(publicBaseApiUrl)`, `onlinePaymentsEnabled(envValue)`.
- `createSdk(baseUrl, accessToken?, policyHolderCode?)` - fresh `OpenIMISDevApiSdk` per call.
- `createBackendProbe({ baseUrl, ... }).isReachable()` - cached reachability check (any HTTP response = up).
- Display: `initials`, `userDisplayName`, `userInitials`, `formatDate`, `formatShortDate`, `formatDateTimeParts`, `formatNumber`, `formatMoney`, `formatRatio`, `formatPercent`, `formatDelta`, `formatAddressLine`.
- Money: `DEFAULT_MONEY_CONFIG`, `normalizeMoneyConfig`, `formatConfiguredMoney`.
- Types: `SearchPageDto`, `AddressDto`, `MoneyClientConfigDto`, `ApiEnvelope`, `EnvelopeResult`, `NameFields`.
- Chart palette: `chartColors`, `employerColors`.
- Validation (zod): `signInSchema`, `registerSchema`, `verifyEmailSchema`, `resendVerifySchema`, `enrollmentRegisterSchema`, `accountClaimSchema`, `createStaffSchema`, `updateStaffSchema`, `formBoolean`, `HF_LEVELS`, `HF_CARE_TYPES`, `HF_STAFF_ROLES`, `addEmployeeBody`, `updateEmployeeBody`, `uploadEmployeesBody`, `createContractBody`, `payContractBody`.

### `portal/server`

- `createSessionCodec<User>({ secret, cookieName, normalizeUser?, now? })` -> `{ seal(session), unseal(token) }`: AES-256-GCM encrypted JWT (`jose`, Web Crypto, edge-safe); `unseal` returns `null` for bad/expired tokens; `seal` throws above `MAX_SESSION_COOKIE_BYTES`.
- `normalizeExpiry(raw, now?)`, `sessionCookieOptions(expiresAt, secure?)`, `MAX_SESSION_COOKIE_BYTES`, types `SessionUserBase`, `SessionData`, `SessionCodec`.

### `portal/client`

- `fetchApiJson<T>(url, init?, { offlineMessage?, sessionExpiredEvent? })`, `ApiClientError` (`status`, `fieldErrors`, `notFound`, `unauthorized`).
- Cache (Dexie): `createPortalCache(config)` (generic), `createHfCache()`, `createEmployerCache()` with `getEntry/setEntry/deleteEntry/clearNamespace/clearAllEntries/countEntriesByNamespace/wipe`, settings (`defaultSettings/loadSettings/saveSettings/mergeSettings/readSettingsFromLocalStorage/isNamespaceEnabled`) and recent rows (`listRecent/pushRecent/clearRecent/removeRecent`); `isEntryStale`, `hashPayload`, `stableStringify`, key builders (`hfScopeKey`, `employerScopeKey`, `buildScopeKey`, `buildCacheId`, `listPath`, `detailPath`, `dashboardPath`, `patientSearchPath`), constants (`HF_CACHE_NAMESPACES`, `EMPLOYER_CACHE_NAMESPACES`, `CACHE_TTL_OPTIONS`, `DEFAULT_CACHE_TTL_MS`).
- `createSwrController(cache, options)` - stale-while-revalidate state machine (`getState/subscribe/load/refresh/seed`), wrap in `useSyncExternalStore`.
- `createMissingIdStore({ storageKey })` / `createMissingPatientStore()` - session-scoped "known 404" ids.
- Offline: `createSessionSnapshotStore(cache)` (`save/read/clear`, `MAX_OFFLINE_AGE_MS`), `isBrowserOnline`, `subscribeOnlineStatus`, `isOffline(serverFallback?)`, `watchServiceWorkerUpdates({ onUpdateAvailable, reload? })`.
- Notifications: `notificationHref(item)`, `notificationSecondaryLabel(item)`, `createDesktopNotifications({ prefKey, tagPrefix, navigate })`, `createSseNotificationClient({ streams, onPayload, onConnectionChange })`.

Tests live in `tests/portal_common/` (IndexedDB is faked with `fake-indexeddb`).

### `portal/employer`

Employer (policy-holder) portal logic, with no web-framework imports and no zod. Import from `openimis-dev-api-sdk-js/portal/employer`. A Next.js route handler is: read the sealed session → `authorizeEmployerRoute(user, "GET /api/members", { onlinePayments })` → `handleMembersList(sdk, url.searchParams)` → `Response.json(result.body, { status: result.status })`, where `sdk` is `createSdk(token, policyHolderCode)` from `portal/common`.

| Module | Contents |
| --- | --- |
| `routes` | One `handleXxx(sdk, input)` per API route returning `{ status, body: { success, data } \| { success: false, error, fieldErrors?, rowErrors? } }`; `authorizeEmployerRoute` (404 payments-off, 401, 403) and `EMPLOYER_ROUTE_PERMISSIONS` |
| `reports` | `handleReportDownload(sdk, kind)` → CSV (BOM, `Content-Disposition`) or an error envelope; column definitions |
| `auth`, `enrollment`, `staff` | Form actions returning structured results (`{ ok: true, session \| redirectTo \| state }` or `{ ok: false, status, values, errors, message, code }`) so the framework layer only sets cookies and redirects; password-reset cookie state helpers |
| `forms`, `validation` | Plain form / JSON-body parsers on top of the SDK validators (first message per field) |
| `session`, `layout`, `access` | `mapSessionUser`, `switchEmployer`, `appGate` / `enrollmentGate` / `guestRedirect`, `accessFor`, `routeAccessKey` |
| `serialize`, `dto` | SDK models to plain JSON DTOs and their types |
| `navigation`, `calculation`, `labels`, `checkout`, `upload`, `paths` | Nav entries (plain strings: icon name, i18n key, permission), calculation-input display helpers (locale passed in), i18n message-key mapping and status tones, checkout planning and polling constants, upload constraints and pre-checks, route paths |

```ts
import { authorizeEmployerRoute, handleMembersList } from "openimis-dev-api-sdk-js/portal/employer";

export async function GET(req: Request) {
  const session = await readSession(req); // your cookie plumbing
  const denied = authorizeEmployerRoute(session?.user, "GET /api/members");
  const result = denied ?? (await handleMembersList(createSdk(session!.accessToken, session!.user.policyHolder?.code), new URL(req.url).searchParams));
  return Response.json(result.body, { status: result.status });
}
```

### `portal/healthfacility`

Health-facility portal logic (no web-framework imports). Import from `openimis-dev-api-sdk-js/portal/healthfacility`. Built on `portal/common` (`EnvelopeResult`, `toUserFacingApiError`, `BackendResult`, zod auth/HF schemas, `normalizeExpiry`). A Next.js route handler is: read the sealed session → `handleClaimsList(createSdk(base, token), url.searchParams)` → `Response.json(result.body, { status: result.status })`; every body is `{ success: true, data } | { success: false, error }` exactly like the original SvelteKit routes.

| Module | Contents |
| --- | --- |
| `claims-handlers`, `preauth-handlers`, `catalog-handlers`, `bulk-handlers`, `patient-config-handlers`, `staffs`, `enrollment`, `auth` | One `handleXxx(sdk, ...)` per API route (query-param parsing, validation, SDK call, error mapping, status codes) |
| `serialize`, `types`, `dashboard-types` | SDK models to plain JSON DTOs (patients, claims/encounters, preauthorizations, search pages) and their types |
| `dashboard` | Raw metrics/analytics to view models (`serializeMetrics`, `serializeAnalytics`), `parseDashboardQuery`, `loadHealthFacilityDashboard`, `handleDashboard` |
| `claim-model`, `claim-lines`, `claim-enrich` | Write bodies to `ClaimModel`, editable/submittable statuses, submit-id parsing, canonical record ids, patient labels, line split/total/money helpers, patient-name enrichment |
| `bulk-csv` | CSV template/build/rewrite (claims vs encounters visit-type rules), row validation |
| `catalog` | Paged catalog search, option/price helpers, `resolveCatalogUnitPrice(kind, option, fetchJson)` |
| `permissions`, `navigation`, `access` | Session permission slimming (cookie size), route to permission map, nav entries (icon / i18n key as plain strings), `resolveAppAccess` / `resolveEnrollmentAccess` / `postLoginPath` redirect decisions |
| `auth` | `mapUser` (slim permissions, no groups), `loginWithCredentials`, `fetchSessionUser`, form actions `submitSignIn` / `submitRegistration` / `submitVerifyEmail` / `submitResendVerification` returning `{ ok: true, ... }` or `{ ok: false, status, errors, message, values }` |
| `staffs`, `enrollment` | Route handlers plus page loaders and form actions (`loadStaffsPage`, `submitCreateStaff`, `loadEnrollmentStatus`, `submitEnrollmentRegister`, ...) |
| `sse`, `notifications`, `patients-format` | `proxyHfSse(request, ...)` returning a standard `Response`, notification deep links, patient display helpers |

Tests live in `tests/portal_healthfacility/`.

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
