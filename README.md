# @rubylith/component-registry

A Contract-Driven Component Registry for UI components with execution contracts and environment
capabilities.

## Overview

This registry system introduces a paradigm shift from traditional component libraries to a
contract-based architecture where:

- Components declare **execution contracts** specifying their requirements
- Environments offer **execution capabilities** to satisfy contracts
- **Adapters** bridge capability gaps with measurable performance costs
- A **registry** coordinates component-environment matching and builds **mount plans**

## Installation

```bash
npm install @rubylith/component-registry
```

## Key Features

- 🔄 **Contract-Driven Architecture**: Components declare what they need, environments declare what
  they provide
- 📊 **Health Scoring**: Comprehensive component health metrics including performance, reliability,
  and compatibility
- 🔌 **Adapter System**: First-class adapter objects that bridge capability gaps with performance
  transparency
- 🎯 **Mount Plan Generation**: AI-assisted mount plan creation with execution modes
  (static/interactive/isolated)
- 🎨 **Visual Intent Assertions**: Ensure design system fidelity with visual regression testing
- 🔐 **Security & Isolation**: Configurable security contexts and resource quotas
- 📈 **Observability**: Deep insights into component usage, performance, and ecosystem health

## Architecture

### Core Concepts

- **Component**: A versioned, distributable UI module with declared contracts
- **Contract**: Specifications defining theme, token, layout, and runtime requirements
- **Environment**: Runtime contexts that provide capabilities
- **Adapter**: Bridges that enable components to work in incompatible environments
- **Mount Plan**: Generated strategies for rendering components
- **Profile**: Reusable mount plan templates with inheritance

### Versioning Strategy

The system uses a three-tier versioning approach:

1. Component Implementation Version (SemVer)
2. Contract Content Version (embedded within components)
3. Contract Schema Version (registry-level evolution)

## Development Status

This project is currently under active development. See our
[Task Master dashboard](/.taskmaster/tasks/tasks.json) for current progress.

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

MIT © Cody Robertson
