# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 3.0.0 (2023-08-18)

### ⚠ BREAKING CHANGES

- Previously csrf-csrf would overwrite any existing token when calling `generateToken` or `req.csrfToken`, this is no longer the case. By default these methods will now return an existing token, making token-per-session the default behaviour. To maintain previous behaviour you will need to set the `overwrite` parameter to true when calling `generateToken` or `req.csrfToken`
- `generateToken` has had the request and response parameters swapped, you will need to update your generateToken invocations to: `generateToken(req, res)`

### Features

- enable per-session token via csrf token reuse ([2f1f8cd](https://github.com/Psifi-Solutions/csrf-csrf/commit/2f1f8cd68e9d74cca38b16f75c4f37c4047d8270))
- swap generateToken request and response parameter order ([54f6c06](https://github.com/Psifi-Solutions/csrf-csrf/commit/54f6c06b975f2c1e32c6c48edaa5bc194b4d6f91))
