# Contributing to mono-event

Thank you for your interest in contributing to the mono-event project!

This document outlines the process for contributing bug reports, feature suggestions, and code contributions.

## Issues

### Bug Reports

If you find a bug, please report it using the GitHub Issue tracker. When reporting bugs, please include:

- A clear and concise description of the bug
- Steps to reproduce the issue
- Expected behavior and actual behavior
- Environment information (Node.js version, browser version, etc.)
- A minimal code example to reproduce the issue, if possible

### Feature Requests

If you have an idea for a new feature, please submit it through the GitHub Issue tracker. Feature requests should include:

- A clear and concise description of the feature
- Use cases or problems it would solve
- Implementation ideas (optional)

## Pull Requests

If you'd like to contribute code, please follow these steps:

1. Fork the project
2. Clone your forked repository
3. Create a new branch (`git checkout -b feature/amazing-feature`)
4. Make your changes
5. Add or update tests and ensure all tests pass
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Create a Pull Request against the original repository

### Pull Request Guidelines

- Rebase your branch on the latest `main` branch before submitting
- Use clear and descriptive commit messages
- Reference any related issues in your PR description
- Follow the existing code style
- Add appropriate tests for new features or changes
- Update documentation if necessary

## Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/mono-event.git
cd mono-event

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

## Coding Conventions

- Use TypeScript types appropriately
- Keep code clean, readable, and properly commented
- Follow the existing code style
- Break large changes into smaller, manageable pieces

## Testing

- Add appropriate tests for new features or fixes
- Don't break existing tests
- Maintain or improve test coverage

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (MIT).

---

If you have any questions or need clarification, feel free to create an issue to ask. We look forward to your contributions!