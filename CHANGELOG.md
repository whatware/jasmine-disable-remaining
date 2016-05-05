# Change Log

All notable changes to this project will be documented in this file.

This change log tries to adhere to [Keep a CHANGELOG](https://github.com/olivierlacan/keep-a-changelog).
This project adheres to [Semantic Versioning](http://semver.org/).

# <a name="Unreleased"></a>Unreleased/master [diff][0.2.0...Unreleased]

This project uses a "dirty trunk" -- i.e., all commits are made against "master".
When a release is ready, it's made from "master".

# <a name="0.2.0"></a>0.2.0 (2016-05-05) [diff][0.1.0...0.2.0]

## Features

- Per suite spec failure count property `result.totalSpecFailures`

## Added

- Every suite that has a failed spec will have a `result.totalSpecFailures` property, which will be the count of failures.
All parent suites of the failed spec will also have this property set, all the way up to the `topSuite`.
- Default failure message -- there is now a `defaultMessage` property such that setting a `message` property will override `defaultMessage` --
so you can now just set the `message` property in `beforeAll` and set it to `null` in `afterAll` to go back to `defaultMessage`

## Changed

- Dependancies -- update `lodash` dependancy to use latest
- Documentation -- Add npm and github [shelds.io](http://shields.io/) badges to [README.md](readme.md)
- Documentation -- Add npm [nodei.co](http://nodei.co/) badge to [README.md](readme.md)
- Documentation -- Some cleanup

# <a name="0.1.0"></a>0.1.0 (2016-04-13)

## Features

- Initial release
- Thanks for the idea https://github.com/Updater/jasmine-fail-fast
- https://github.com/olivierlacan/keep-a-changelog

## Added

- Everything

## Changed

_n/a_

## Deprecated

_n/a_

## Removed

_n/a_

## Fixed

_n/a_

[0.2.0...Unreleased]: https://github.com/whatware/jasmine-disable-remaining/compare/0.2.0...master "Compare 0.2.0 to Unreleased"
[0.1.0...0.2.0]: https://github.com/whatware/jasmine-disable-remaining/compare/0.1.0...0.2.0 "Compare 0.1.0 to 0.2.0"
