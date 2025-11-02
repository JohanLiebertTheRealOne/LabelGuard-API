# Contributing to LabelGuard API

Thank you for your interest in contributing to LabelGuard API! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Install dependencies: `npm install`
5. Make your changes
6. Run tests: `npm test`
7. Ensure linting passes: `npm run lint`
8. Submit a pull request

## Development Setup

1. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

2. Set your USDA API key in `.env`

3. Start development server:
   ```bash
   npm run dev
   ```

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(foods): add dataType filter parameter

Allow filtering search results by USDA data type (Branded, SR Legacy, etc.)

Closes #123
```

```
fix(validation): correct allergen detection for tree nuts

Tree nut variations were not being detected correctly.
Updated getAllergenVariations to include cashew and pistachio.

Fixes #456
```

## Code Style

- Follow the existing code style
- Use TypeScript strict mode
- Prefer explicit types over `any`
- Use ESLint and Prettier (run `npm run format` before committing)
- Maximum line length: 100 characters
- Use meaningful variable and function names

## Testing

- Write tests for new features
- Maintain 80%+ test coverage
- Run `npm run coverage` to check coverage
- Include both unit and integration tests where appropriate

### Test Structure

```
test/
├── unit/           # Unit tests for services, utils, etc.
└── integration/    # Integration tests for endpoints
```

## Pull Request Process

1. Update documentation if needed
2. Ensure all tests pass
3. Update CHANGELOG.md (if applicable)
4. Request review from maintainers
5. Address review feedback
6. Once approved, maintainers will merge

## Project Structure

- `src/` - Source code
  - `config/` - Configuration
  - `controllers/` - Request handlers
  - `domain/` - Domain models and schemas
  - `middleware/` - Express middleware
  - `routes/` - Route definitions
  - `services/` - Business logic
  - `utils/` - Utility functions
- `test/` - Tests
- `docs/` - Documentation

## Adding New Features

1. **Plan**: Discuss major changes in an issue first
2. **Implement**: Follow the existing architecture
3. **Test**: Add comprehensive tests
4. **Document**: Update README and OpenAPI spec
5. **Refactor**: Keep code clean and maintainable

## Reporting Issues

Use GitHub Issues to report bugs or request features. Include:

- Description of the issue
- Steps to reproduce
- Expected vs. actual behavior
- Environment details (Node version, OS, etc.)
- Relevant logs or error messages

## Questions?

Open a GitHub Discussion or issue for questions about:
- Architecture decisions
- Feature proposals
- Implementation guidance

Thank you for contributing! 🎉

