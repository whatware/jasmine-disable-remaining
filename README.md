# jasmine-disable-remaining 0.3.0 (2016-05-13)

When a spec fails, either disable all remaining specs, or all remaining specs in the same file, or all specs in suites matching a pattern.

[![GitHub issues](https://img.shields.io/github/issues/whatware/jasmine-disable-remaining.svg?maxAge=3600&style=plastic)](https://github.com/whatware/jasmine-disable-remaining/issues)
[![GitHub release](https://img.shields.io/github/release/whatware/jasmine-disable-remaining.svg?maxAge=3600&style=plastic)](https://github.com/whatware/jasmine-disable-remaining)
[![GitHub tag](https://img.shields.io/github/tag/whatware/jasmine-disable-remaining.svg?maxAge=3600&style=plastic)](https://github.com/whatware/jasmine-disable-remaining)
[![npm](https://img.shields.io/npm/v/jasmine-disable-remaining.svg?maxAge=3600&style=plastic)](https://www.npmjs.com/package/jasmine-disable-remaining)

[![NPM](https://nodei.co/npm/jasmine-disable-remaining.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/jasmine-disable-remaining/)

Provided as a reporter class for the jasmine test framework.

## Installation

The easiest way is to keep `jasmine-disable-remaining` as a `devDependency` in your `package.json`. Just run

```sh
npm install jasmine-disable-remaining --save-dev
```

to let `npm` automatically add it there.

## Configuration

### `protractor`

In your `protractor.conf.js` file

* At the top, or with the other `require` lines, add:

```js
const JasmineDisableRemaining = require('jasmine-disable-remaining');
```

* In the `config.onPrepare` function, add:

```js
    browser.params.jasmineDisableRemainingReporter = new JasmineDisableRemaining(jasmine);

    if (browser.params.disableRemainingSpecsOnFail === true) {
        browser.params.jasmineDisableRemainingReporter.jasmineDisableRemaining.config.allSpecsByCLI.disableSpecs = true;
    }

    jasmine.getEnv().addReporter(browser.params.jasmineDisableRemainingReporter);
```

### `grunt` + `protractor`

If you are using `grunt`, this configuration will allow you to specify the `protractor` flag from the `grunt` command line.

You must modify the `protractor` configuration in your `Gruntfile.js` as: 
```js
    protractor: {
        options: {
            args: {
                params: {
                    // Map the `grunt` command line argument:
                    //     --disableRemainingSpecsOnFail=true
                    // to the `protractor` boolean property:
                    //     browser.params.disableRemainingSpecsOnFail
                    disableRemainingSpecsOnFail: grunt.option('disableRemainingSpecsOnFail')
                }
            }
        }
    }
```

### `grunt` + regular `jasmine`

TODO

## Usage

Disabling is not _turned on_ until/unless you specify so either on the command line or somewhere in your test code.

### `protractor`

To just disable all tests after the first fail, run your usual `protractor` command with the extra flag:

```sh
--params.disableRemainingSpecsOnFail=true
```

e.g.:

```sh
protractor --params.disableRemainingSpecsOnFail=true
```

### `grunt`

To just disable all tests after the first fail, run your usual `grunt` command with the extra flag:

```sh
--disableRemainingSpecsOnFail=true
```

e.g.:

```sh
grunt test --disableRemainingSpecsOnFail=true
```

### Dynamic

You can also specify dynamically (within you tests) when to disable all remaining specs.

#### Disable all remaining specs

```js
    const config = browser.params.jasmineDisableRemainingReporter.jasmineDisableRemaining.config;
    config.allSpecsDynamic.disableSpecs = true;
```

Use this if you want to disable all tests after the first fail.
It must be set before the spec you're interested in.

Typically, you would put it in a `beforeAll`.
You can also just set it in `config.onPrepare`.

#### Disable all remaining specs _in a file_

Turn on using (typically in a `beforeAll`)

```js
    const config = browser.params.jasmineDisableRemainingReporter.jasmineDisableRemaining.config;
    config.allFileSpecsDynamic.disableSpecs = true;
```

Turn off using (typically in a `afterAll`)

```js
    const config = browser.params.jasmineDisableRemainingReporter.jasmineDisableRemaining.config;
    config.allFileSpecsDynamic.disableSpecs = false;
```

Use this if you want to disable all tests in a file after the first fail.
It must be set before the spec you're interested in.
**_Please note_** this setting is global.
It must be turned off so it doesn't affect other files.

**TL; DR**: if you don't remember to turn this off, all remaining files will have this turned on.

You can also just set it in `config.onPrepare` and then for any file with a failure,
all remaining specs _in that file_ will be disabled.

#### Disable all specs in suites _matching a pattern_

Use this if you want to disable all tests in any suites with matching description.

This is useful if you have a large number of specs that are broken in to "categories",
and have them broken down across a large number of files from basic to complex.
Take the following example scenario of types of suite files.

You have multiple "categories" of components being tested (e.g., "admin-panel", "client-panel"),
broken down as follows in each category:

- Smoke tests -- these tests run first, verifying all the lowest level required interactions (e.g., REST calls)
- Existence tests -- these tests run second, ensuring all components exist, are present, are visible, etc.
- Rudimentary tests -- these tests run third, and perform simple interactions
- Comprehensive tests -- these tests run last, and are the full/complex tests

If any upper level specs fail, the subsequent level would also fail.

E.g., if your "admin-panel" smoke tests fail, you would want to disable only the remaining "admin-panel" tests.
So, all your "admin-panel" spec files would have a top-most `describe('admin-panel: blah blah'...`,
and your matcher pattern would be `/^admin-panel:/`.

Also, by breaking the tests up in this way, you may be able to more easily determine if the issues are fundamental or system wide.

Turn on using

```js
    const jasmineDisableRemaining = browser.params.jasmineDisableRemainingReporter.jasmineDisableRemaining;
    let matcherGUID;

    beforeAll(() => {
        matcherGUID = jasmineDisableRemaining.addSuitesMatcher(/^Some prefix/, {
            message: [
                '---------------------------------------------------------------------------------------------------',
                '\nSpecs have FAILED and specified that all specs in suites matching /^Some prefix/ should be disabled',
                '\n---------------------------------------------------------------------------------------------------'
            ]
        });
    });
```

Turn off using

```js
    afterAll(() => {
        browser.params.jasmineDisableRemainingReporter.jasmineDisableRemaining.removeSuitesMatcher(matcherGUID);
    });
```

**NOTE**: if you don't remember to turn this off, any remaining spec that fails will cause these matched suites to be disabled

#### Change the failure messages

There are three different types of messages:

```js
    const config = browser.params.jasmineDisableRemainingReporter.jasmineDisableRemaining.config;
    config.allSpecsByCLI.message = 'disabling all specs turned on by command line';
    config.allSpecsDynamic.message = 'disabling all specs turned on in a suite';
    config.allFileSpecsDynamic.message = 'disabling all specs in a file turned on in a suite';
```

See `defaultConfig` in [`dist/jasmine-disable-remaining.js`](dist/jasmine-disable-remaining.js)
for all default message vaules.

To change e.g., `allFileSpecsDynamic` message using (typically in a `beforeAll`)

```js
    config.allFileSpecsDynamic.message = 'my custom message string';
```

or

```js
    config.allFileSpecsDynamic.message = [
        '-------------------------',
        '\nMy custom verbose message',
        '\n-------------------------'
    ];
```

Revert to the default message using (typically in a `afterAll`)

```js
    config.allFileSpecsDynamic.message = null;
```

### Advanced

By default, when using "Disable all remaining specs _in a file_", disabling of `afterAllFns` and `afterFns` is turned off,
so that those functions are not disabled.
This is because it is assumed that by default, there may be essential cleanup that may need to happen.

If you turn these on so that the become disabled, just remember that you won't be able to turn off any settings after a fail.

## Changelog / Release History

See [CHANGELOG.md](CHANGELOG.md).

## Thanks

Thanks for the idea https://github.com/Updater/jasmine-fail-fast
