# Brand-specific integrations

> Canonical version. Swedish: [brand-integrations.sv.md](brand-integrations.sv.md).
> Code identifiers are Swedish and appear verbatim.

The workshop already has its contracts. The Volvo workshop has VIDA, the VAG
workshop has erWin, the independent workshop has a vehicle-data vendor. None of
them wants us to be the middleman for their subscription — and none of them has
the same set as the workshop next door.

That is why **the customer configures their own integrations** under
**Settings → Brand-specific integrations**, with their own credentials. We
provide the frame, not the account.

## Principles

**The credentials never reach the browser.** The same rule as for the
platform's own API keys: secrets live on the server. Credentials are encrypted
with AES-256-GCM before being written to the database, and the API returns
secret fields masked (`••••3456`). The client can see *that* an integration
exists and when it last worked — never what the key is.

**All lookups are performed by the server.** The client sends an identifier
(VIN or registration number); the server fetches the credentials, decrypts them
in memory, calls the vendor and returns only the mapped vehicle fields.

**Fail closed.** If the encryption key (`INTEGRATION_NYCKEL`) is missing,
nothing is saved — the API answers 503 and the settings page explains why. The
alternative, storing in plaintext "for now", does not exist.

**System administrator only.** Adding, changing and removing integrations
requires the `admin` role. A technician can read the register of available
vendors (otherwise the settings page cannot show them) but never any
organisation's credentials.

**Organisation-scoped.** Integrations belong to the organisation, just like case
data. No tenant sees another's.

## Vendors are data, not code

The register lives in `services/plattform/integrationer.json` and can be swapped
for a ConfigMap mount via `INTEGRATIONER_FIL`. A vendor is described entirely
declaratively:

```json
{
  "id": "volvo_vida",
  "namn": "Volvo VIDA",
  "falt": [
    { "nyckel": "bas_url", "etikett": "Bas-URL (använd {vin} som platshållare)", "hemlig": false },
    { "nyckel": "api_nyckel", "etikett": "API-nyckel", "hemlig": true }
  ],
  "uppslag": {
    "urlFalt": "bas_url",
    "auth": "header",
    "authHeader": "X-Api-Key",
    "authFalt": "api_nyckel",
    "svarsfalt": { "marke": "make", "modell": "model", "arsmodell": "year" }
  }
}
```

* `falt` (fields) — what the administrator has to fill in. `hemlig: true`
  (secret) governs both encryption and masking.
* `uppslag.auth` (lookup auth) — `bearer`, `header`, `basic` or `query`. No
  vendor-specific code branches; all variation lives in the register.
* `svarsfalt` (response fields) — mapping from the vendor's JSON (dot notation
  supported) to our vehicle fields.
* `nyckeltyp: "regnr"` — the lookup is done on registration number instead of
  VIN. `{vin}` / `{regnr}` in the URL template are substituted URL-encoded.

A new brand is therefore added by describing it — not by rebuilding the
application.

## What a lookup does and does not do

The lookup fills in the **vehicle description** (make, model, year, engine,
transmission). That is context data, not evidence: an answer from a vendor is
never a performed check and does not count in the
[evidence engine](evidence-engine.md). If the vendor returns no known fields,
the system says so plainly instead of showing empty rows.

Every lookup writes `senast_testad` (last tested) and `senaste_status` (last
status) on the integration. An expired subscription therefore shows up in
settings as an error message from the vendor, not as silently empty answers.

## API

| Route | Method | Role | What |
| --- | --- | --- | --- |
| `/api/integrationer/leverantorer` | GET | logged in | The register (field definitions, no credentials) |
| `/api/integrationer` | GET | admin | The organisation's integrations, secrets masked |
| `/api/integrationer` | POST | admin | Save/update credentials (encrypted) |
| `/api/integrationer/{leverantor}` | DELETE | admin | Remove |
| `/api/integrationer/{leverantor}/uppslag` | POST | logged in | Look up VIN/registration via the server |

Fully documented in `services/plattform/openapi.yaml`.

## Operations

`INTEGRATION_NYCKEL` is 32 bytes of hex or base64 (`openssl rand -hex 32`),
delivered via the secret `felsokning-hemligheter` — see
[OPERATIONS.md](../OPERATIONS.md). If the key is rotated, the integrations must
be saved again; the service then shows no values rather than guessing.
