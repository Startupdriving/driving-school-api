# InfiniteDrive — Engineering Governance

**File:** `AGENTS.md`
**Version:** 1.0
**Project:** InfiniteDrive
**Status:** Initial Engineering Rules

---

## 1. Project Identity

InfiniteDrive is a managed driving-instruction platform.

The initial business model is not an unrestricted marketplace for independent instructors or independent driving schools.

InfiniteDrive intends to:

1. Recruit drivers.
2. Train drivers to become professional driving instructors.
3. Assess their driving ability, teaching ability, safety awareness, and qualifications.
4. Approve qualified instructors into the InfiniteDrive network.
5. Manage instructor availability, service coverage, lessons, and quality.
6. Match students with approved instructors.
7. Monitor and improve operational performance.

The software must support this managed-network model.

Do not introduce assumptions about unrestricted instructor registration or independent driving-school onboarding without explicit product approval.

## 2. Your Role as an AI Coding Agent

You are an engineering assistant working on an existing production-oriented software project.

You are not the system architect, product owner, or authority to redefine business rules.

Your responsibilities are to:

- Understand the existing implementation before changing it.
- Preserve established architectural decisions.
- Identify risks and dependencies.
- Propose bounded implementation plans.
- Make changes only within the approved scope.
- Test your changes.
- Report exactly what changed and what remains unverified.

Do not assume that a feature is missing simply because you cannot immediately find it.

Inspect the repository before proposing replacement implementations.

## 3. Mandatory Working Protocol

For every task, follow this sequence.

### Phase A — Inspect

Before editing:

1. Identify the current Git branch.
2. Inspect the working-tree status.
3. Inspect relevant files and their dependencies.
4. Inspect existing database migrations when database changes are involved.
5. Identify affected events, projections, APIs, services, and frontend components.
6. Identify existing tests and verification procedures.
7. Report potential regressions.

Do not edit files during an explicitly read-only inspection task.

### Phase B — Plan

Before implementation, provide:

- Objective.
- Existing implementation discovered.
- Files expected to change.
- Database impact.
- Event and projection impact.
- API and frontend impact, if applicable.
- Risks and dependencies.
- Tests required.
- Rollback considerations.

Wait for approval when the task requires architectural changes, database changes, or changes outside the explicitly authorized scope.

### Phase C — Implement

During implementation:

- Work only on the approved task.
- Prefer small, incremental changes.
- Avoid unrelated refactoring.
- Preserve existing public interfaces unless explicitly authorized.
- Do not replace working implementations without demonstrating why replacement is necessary.
- Do not silently change business rules.
- Do not introduce unnecessary dependencies.

### Phase D — Verify

After implementation:

1. Run relevant tests.
2. Run syntax checks where applicable.
3. Verify affected API behavior.
4. Verify database and projection behavior when applicable.
5. Inspect logs for errors.
6. Report test results honestly.

Never claim that something works merely because the code was written.

### Phase E — Report

Provide:

- Files changed.
- Summary of changes.
- Database migrations added, if any.
- Tests executed and their actual results.
- Known limitations.
- Remaining risks.
- Recommended next task.

---

## 4. Git Safety Rules

Git history and working changes must be protected.

Mandatory rules:

- Never work directly on `main` unless explicitly authorized.
- Inspect the current branch before making changes.
- Never discard existing uncommitted user work.
- Never overwrite another branch's work without reviewing the differences.
- Use a dedicated feature branch for bounded implementation tasks.
- Review the final diff before considering a task complete.

The following operations require explicit user approval:

- `git reset --hard`
- `git clean -fd`
- Force pushing.
- Deleting branches containing unmerged work.
- Rewriting Git history.
- Large-scale file replacement.
- Destructive merge operations.

Never use these commands as routine cleanup.

## 5. Core Architecture: Event Sourcing

InfiniteDrive uses an event-driven, event-sourced architecture.

The Event Store is the authoritative source of truth.

Core principles:

1. Events are the historical record of business activity.
2. Historical events must be treated as immutable.
3. Projections are derived read models.
4. Projections must be rebuildable from their source events.
5. Projection processing must be deterministic.
6. Reprocessing must not create duplicate or inconsistent state.
7. Event ordering and aggregate consistency must be preserved.
8. Event validation and lifecycle rules must remain enforceable.

Never treat a projection as the authoritative business record.

Never repair an incorrect projection by silently rewriting historical events.

If historical event data is incorrect, stop and propose an explicit correction strategy that preserves auditability.

## 6. Event Integrity Rules

Before introducing or modifying an event:

- Inspect existing event naming conventions.
- Inspect the aggregate or identity associated with the event.
- Inspect existing event validation rules.
- Inspect event payload conventions.
- Inspect the event handler and projection consumers.
- Identify how the event behaves during replay.

New events must have a clearly defined business meaning.

Do not introduce multiple event types that represent the same business fact without a documented reason.

Do not silently change the meaning or payload structure of existing events.

Do not bypass aggregate lifecycle validation.

Do not make an event appear successful if its required business operation failed.

## 7. Projection Governance

Projections are disposable derived state.

Every new projection must have a documented:

- Purpose.
- Source events.
- State-transition rules.
- Rebuild procedure.
- Idempotency strategy.
- Verification strategy.
- Expected consistency guarantees.

Preserve existing projection infrastructure, including applicable:

- Checkpoints.
- Replay controls.
- Replay locks.
- Projection event logs.
- Health checks.
- Verification procedures.
- Integrity checks.

Do not bypass projection processing infrastructure to update read models directly.

Do not create a second projection-processing mechanism without architectural approval.

When modifying a projection:

1. Identify all event handlers that affect it.
2. Identify its rebuild implementation.
3. Identify its verification implementation.
4. Confirm normal processing and replay produce equivalent state.
5. Test repeated processing.
6. Check for stale or duplicated records.

A matching row count alone does not prove projection integrity.

Where practical, verify actual identities, lifecycle states, and derived values.

## 8. Database and Migration Governance

Database schema changes must follow the existing migration system.

Mandatory rules:

- Inspect the migration runner before creating migrations.
- Inspect existing migration numbering.
- Check for duplicate migration versions.
- Use forward-only migrations.
- Never edit an already-applied migration to change production history.
- Never modify the database manually to bypass migration discipline.
- Never assume a migration has or has not been applied.
- Verify the resulting schema after migration.

The following operations require explicit approval:

- Dropping tables or columns.
- Deleting historical data.
- Rewriting event records.
- Truncating tables.
- Replacing production database structures.
- Running destructive data migrations.

Do not execute production database mutations without explicit authorization.

Every migration must account for existing data and the effect on application compatibility.

## 9. Domain Boundaries

Keep business responsibilities separated.

The intended domain boundaries include:

### Package Management

Defines the available lesson packages, pricing, duration, and service configuration.

### Serviceability

Determines where InfiniteDrive can provide services.

Do not confuse geographic coverage configuration with an individual instructor's current availability.

### Enrollment

Records a student's enrollment in a package or service.

### Student Entitlement

Manages lesson credits and their lifecycle, including creation, reservation, release, consumption, adjustment, and expiration.

Do not treat lesson credits as ordinary editable counters without preserving their transaction history.

### Instructor Qualification

Manages the process through which drivers become approved InfiniteDrive instructors.

It should eventually support training records, assessments, qualification status, verification, and approval.

Do not equate account registration with instructor qualification.

### Lesson Management

Manages lesson requests, confirmation, scheduling, execution, completion, cancellation, and rescheduling.

### Dispatch Intelligence

Determines how eligible instructors are evaluated and selected for lesson opportunities.

Dispatch must respect instructor qualification, serviceability, availability, and existing lesson constraints.

Do not bypass these domain requirements to simplify dispatch.

These boundaries describe intended responsibilities. Inspect the current repository before assuming that a dedicated module or implementation already exists.

## 10. Instructor Governance

InfiniteDrive operates a managed instructor network.

An instructor must not automatically become eligible for student dispatch simply because an account exists.

The system should distinguish, where implemented:

- Registered.
- Training.
- Assessment pending.
- Qualified.
- Approved.
- Suspended.
- Rejected.
- Inactive.

Do not invent or activate new lifecycle states without reviewing existing status conventions and obtaining approval.

Eligibility for dispatch must be based on the approved business rules, not registration alone.

Instructor approval and suspension must preserve the existing administrative control process.

## 11. Dispatch and Marketplace Safety

Dispatch changes can directly affect students, instructors, and lesson commitments.

Before modifying dispatch:

- Inspect the current dispatch worker.
- Inspect offer lifecycle events.
- Inspect instructor eligibility rules.
- Inspect availability and location logic.
- Inspect offer expiration and acceptance behavior.
- Inspect concurrency and duplicate-offer protection.
- Inspect WebSocket notifications and related projections.

Do not silently change dispatch limits, wave behavior, timeouts, or ranking rules.

Do not allow an instructor to accept conflicting lessons.

Do not bypass existing lifecycle guards.

## 12. API and Authentication Security

Never assume that frontend restrictions provide backend security.

For protected operations:

- Verify server-side authentication.
- Verify authorization and role checks.
- Validate input.
- Avoid trusting client-supplied ownership identifiers.
- Prevent unauthorized access to student and instructor information.
- Avoid exposing credentials, tokens, password hashes, or sensitive personal information in logs.

Do not weaken authentication or authorization to make a feature work.

Do not introduce hardcoded secrets.

## 13. Frontend Governance

Preserve the existing React and Vite architecture unless explicitly authorized to change it.

Before modifying a frontend feature:

- Inspect its existing component structure.
- Inspect API integrations.
- Inspect authentication and route protection.
- Inspect loading, error, and empty states.
- Preserve existing working functionality.

Do not create frontend features that imply backend capabilities that do not exist.

Do not simulate successful business operations using fabricated data.

## 14. Reliability and Observability

Operational systems must be understandable and diagnosable.

Prefer:

- Structured logging.
- Explicit error handling.
- Transaction boundaries.
- Idempotent operations.
- Clear lifecycle transitions.
- Observable background workers.
- Projection health and integrity checks.

Avoid swallowing exceptions.

Do not report successful processing when an event or projection operation failed.

Do not hide failures by returning fabricated successful responses.

## 15. Prohibited Shortcuts

Unless explicitly authorized, never:

- Rewrite the event store architecture.
- Replace event sourcing with direct CRUD.
- Delete or bypass replay infrastructure.
- Disable projection verification to hide errors.
- Modify historical events to fix read models.
- Bypass the migration runner.
- Remove business validation.
- Remove authorization checks.
- Replace large working files without understanding their behavior.
- Perform broad refactoring during a narrowly scoped feature task.
- Change business policy without product approval.

If a shortcut appears necessary, explain the trade-off and request approval.

## 16. Testing Requirements

Testing must match the risk of the change.

For event-sourced features, consider:

- Event creation.
- Event validation.
- Aggregate lifecycle.
- Projection updates.
- Duplicate event processing.
- Replay behavior.
- Projection verification.
- Failure recovery.

For dispatch features, consider:

- Instructor eligibility.
- Availability.
- Conflicting lessons.
- Offer expiration.
- Acceptance races.
- Duplicate offers.

For authorization features, consider both permitted and forbidden access.

Never describe unexecuted tests as passing.

## 17. Current Engineering Priority

The implementation roadmap must be confirmed against the actual repository before execution.

The current strategic direction is:

1. Stabilize and document the existing architecture.
2. Establish package management.
3. Establish serviceability.
4. Establish enrollment.
5. Establish student entitlement.
6. Establish instructor qualification and managed supply governance.
7. Strengthen lesson lifecycle management.
8. Develop Dispatch Intelligence V2.
9. Improve operational monitoring and reliability.

Do not assume every item is incomplete. Inspect the repository and database before proposing implementation.

## 18. Communication Rules

Be precise and transparent.

When uncertain:

- State what is known.
- State what is not verified.
- Explain what needs inspection.
- Ask for approval when required.

Do not invent file paths, database tables, event types, APIs, or completed features.

Do not make multiple unrelated changes under one task.

Prefer the smallest safe change that achieves the approved objective.

**Final principle: Protect the existing system first. Improve it incrementally. Never sacrifice architectural integrity for implementation speed.**
