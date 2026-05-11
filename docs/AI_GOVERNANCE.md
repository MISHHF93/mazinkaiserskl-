# AI governance & security alignment

This codebase is structured to support **ISO/IEC 42001** (AI management system), **27001** (ISMS), **25010** quality attributes, **9001** QMS traceability, **31000** risk treatment, **27017** cloud controls, **22989 / 23053** AI terminology and ML framework hooks, and mapping to the **NIST AI RMF** (govern, map, measure, manage).

Concrete implementations in the MVP:

| Control | Implementation |
|---------|----------------|
| Policy before model | `SafetyGovernor` deterministic layer |
| Auditability | JSONL append-only `AUDIT_LOG_PATH` |
| Observability | Structured logging, `/health/*` |
| Explainability | Persona system prompt + mode metadata surfaced to UI |
| Privacy | No PII required; session memory in-process |
| Resilience | Stub LLM path when keys absent; graceful degradation |

Operational teams should extend this file with data-retention policy, model card links, and incident response runbooks.
