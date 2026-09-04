# Contributing to AI Social Manager

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/ai-social-manager.git
   ```
3. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Set up your development environment (see README.md)

## Development Workflow

### Code Style

- Use TypeScript for all new code
- Follow the existing code style and conventions
- Use Prettier for formatting: `npm run format`
- Use ESLint for linting: `npm run lint`

### Commit Messages

Follow the Conventional Commits specification:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example:
```
feat: add Twitter thread support
fix: resolve scheduling timezone issue
docs: update API documentation
```

### Testing

- Write tests for all new features and bug fixes
- Ensure all tests pass before submitting: `npm test`
- Maintain or improve test coverage: `npm run test:coverage`
- Use React Testing Library for component tests
- Use Jest for unit and integration tests

### Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Update the README if adding new features
5. Request a review from maintainers

### Code Review

All submissions require review. We use GitHub pull requests for this purpose.

- Respond to all feedback
- Make requested changes
- Re-request review when ready

## Reporting Bugs

1. Check existing issues first
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details

## Feature Requests

1. Check existing feature requests
2. Create a new issue with:
   - Clear description
   - Use case
   - Expected behavior

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow

## Questions?

Feel free to open an issue for any questions about contributing.
