# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [3.0.3](https://github.com/Psifi-Solutions/csrf-csrf/compare/v3.0.1...v3.0.3) (2023-12-16)


### Bug Fixes

* improve CommonJS TypeScript support ([a9dfbb7](https://github.com/Psifi-Solutions/csrf-csrf/commit/a9dfbb7dd85cafebac68827d9d93a4996163356f))
* remove duplicate string in union type RequestMethod ([4e9f344](https://github.com/Psifi-Solutions/csrf-csrf/commit/4e9f344ea288beaa278c7121248a297bac6ac2a3))

### [3.0.2](https://github.com/Psifi-Solutions/csrf-csrf/compare/v3.0.1...v3.0.2) (2023-11-05)


### Features

* support multiple secrets (backwards compatible) ([51da818](https://github.com/Psifi-Solutions/csrf-csrf/commit/51da818ef1dfb729b894457e4316e028df0b380f))


### Bug Fixes

* accept validateOnGeneration param in req.csrfToken ([0d6187a](https://github.com/Psifi-Solutions/csrf-csrf/commit/0d6187a9c31ea13b73127774ae6f01bd96baf3dc))
* picking a secret in generateTokenAndHash ([2b4f540](https://github.com/Psifi-Solutions/csrf-csrf/commit/2b4f540bb93e92440a91cc2c53265e96c84a23c1))
* typing in CsrfTokenCreator ([8f4d03f](https://github.com/Psifi-Solutions/csrf-csrf/commit/8f4d03f24adb9f13135c9b847bd87eceb08da1d0))

### [3.0.1](https://github.com/Psifi-Solutions/csrf-csrf/compare/v3.0.0...v3.0.1) (2023-09-15)

### Bug Fixes

- types for TypeScript moduleResolution ([#32](https://github.com/Psifi-Solutions/csrf-csrf/issues/32)) ([6a5cd2c](https://github.com/Psifi-Solutions/csrf-csrf/commit/6a5cd2c43e4940577856cc08a565da79c4e1348b))

## 3.0.0 (2023-08-18)

### ⚠ BREAKING CHANGES

- Previously csrf-csrf would overwrite any existing token when calling `generateToken` or `req.csrfToken`, this is no longer the case. By default these methods will now return an existing token, making token-per-session the default behaviour. To maintain previous behaviour you will need to set the `overwrite` parameter to true when calling `generateToken` or `req.csrfToken`
- `generateToken` has had the request and response parameters swapped, you will need to update your generateToken invocations to: `generateToken(req, res)`

### Features

- enable per-session token via csrf token reuse ([2f1f8cd](https://github.com/Psifi-Solutions/csrf-csrf/commit/2f1f8cd68e9d74cca38b16f75c4f37c4047d8270))
- swap generateToken request and response parameter order ([54f6c06](https://github.com/Psifi-Solutions/csrf-csrf/commit/54f6c06b975f2c1e32c6c48edaa5bc194b4d6f91))
