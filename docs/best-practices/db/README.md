# Database Best Practices Documentation

This directory contains comprehensive best practices documentation for PostgreSQL database development and operations.

## Topics Covered

1. [Schema Design](./01-schema-design.md)
2. [Table & Column Naming](./02-table-column-naming.md)
3. [Data Types](./03-data-types.md)
4. [Indexing](./04-indexing.md)
5. [Query Best Practices](./05-query-best-practices.md)
6. [Query Performance Tuning](./06-query-performance-tuning.md)
7. [Transactions](./07-transactions.md)
8. [Migration Strategy](./08-migration-strategy.md)
9. [Database Version Control](./09-database-version-control.md)
10. [Data Integrity](./10-data-integrity.md)
11. [Relationship Best Practices](./11-relationship-best-practices.md)
12. [Security](./12-security.md)
13. [Database Connection Management](./13-database-connection-management.md)
14. [Backups & Restore](./14-backups-restore.md)
15. [High Availability & Replication](./15-high-availability-replication.md)
16. [Partitioning & Sharding](./16-partitioning-sharding.md)
17. [Logging & Monitoring](./17-logging-monitoring.md)
18. [Storage & Maintenance](./18-storage-maintenance.md)
19. [Data Lifecycle Management](./19-data-lifecycle-management.md)
20. [JSONB Guidelines](./20-jsonb-guidelines.md)
21. [Bulk Operations](./21-bulk-operations.md)
22. [Error Handling in SQL](./22-error-handling-sql.md)
23. [Testing with PostgreSQL](./23-testing-postgresql.md)
24. [Migration Safety Checklist](./24-migration-safety-checklist.md)

## How to Use

Each file covers a specific topic with:
- Clear guidelines and patterns
- Code examples (when applicable)
- Best practices specific to PostgreSQL
- Common pitfalls to avoid

## Project-Specific Context

This documentation is tailored for:
- **Database**: PostgreSQL
- **Current Setup**: Uses `pg` library with connection pooling
- **Migrations**: Custom migration scripts in `server/scripts/`
- **Schema**: Uses UUID primary keys, JSONB for flexible data

## Related Documentation

- Backend best practices: `../API/README.md`
- Frontend best practices: `../Frontend/README.md`
- Local setup: project root `README.md`

## Contributing

When adding new patterns or updating existing ones:
1. Keep files between 50-70 lines
2. Include practical examples
3. Reference PostgreSQL-specific features
4. Update this README if adding new topics

