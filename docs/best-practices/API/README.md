# Backend Best Practices Documentation

This directory contains comprehensive best practices documentation for Node.js backend development.

## Topics Covered

1. [Project Structure](./01-project-structure.md)
2. [API Design (REST)](./02-api-design-rest.md)
3. [Controllers & Services](./03-controllers-services.md)
4. [Validation](./04-validation.md)
5. [Authentication & Authorization](./05-authentication-authorization.md)
6. [Error Handling](./06-error-handling.md)
7. [Logging](./07-logging.md)
8. [Configuration Management](./08-configuration-management.md)
9. [Security](./09-security.md)
10. [Database Access (PostgreSQL)](./10-database-access-postgresql.md)
11. [Caching](./11-caching.md)
12. [Performance](./12-performance.md)
13. [File Handling](./13-file-handling.md)
14. [Background Jobs & Queues](./14-background-jobs-queues.md)
15. [Messaging & Events](./15-messaging-events.md)
16. [Testing (Backend)](./16-testing-backend.md)
17. [API Documentation](./17-api-documentation.md)
18. [Version Control & Branching](./18-version-control-branching.md)
19. [Deployment Practices](./19-deployment-practices.md)
20. [Observability](./20-observability.md)
21. [Rate Limiting & Throttling](./21-rate-limiting-throttling.md)
22. [Feature Flags](./22-feature-flags.md)
23. [Maintainability Standards](./23-maintainability-standards.md)
24. [API Version Lifecycle](./24-api-version-lifecycle.md)

## How to Use

Each file covers a specific topic with:
- Clear guidelines and patterns
- Code examples (when applicable)
- Best practices specific to this project
- Common pitfalls to avoid

## Project-Specific Context

This documentation is tailored for:
- **Framework**: Express.js
- **Database**: PostgreSQL (using `pg` library)
- **Authentication**: JWT tokens
- **Current Structure**: Routes contain business logic (consider extracting to services)

## Contributing

When adding new patterns or updating existing ones:
1. Keep files between 50-70 lines
2. Include practical examples
3. Reference project-specific implementations
4. Update this README if adding new topics

## Related Documentation

- Frontend Best Practices: `../Frontend/README.md`
- API Documentation: Consider adding Swagger/OpenAPI
- Deployment: See project root `README.md` (Quick Setup and deployment notes)

