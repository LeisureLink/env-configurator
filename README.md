# env-configurator

Currently a small module intended to handle resolving services from DNS SRV records. The module
requires a either a minimal configuration object or a path to a configuration file in order
to do anything useful.

In the future I'll try to expand the scope of this to handle environment variables and act as a general
configuration utility for LL node projects.

## Installation

Clone this repository and use npm to install dependencies.

```npm install```

##Tests

```npm test```

or

```mocha -R spec```