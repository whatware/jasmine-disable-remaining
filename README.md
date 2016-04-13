# jasmine-disable-remaining 0.1.0 (2016-04-13)

When a spec fails, either disable all remaining specs, or all remaining specs in the same file.
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
    browser.params.jasmineDisableRemainingReporter.jasmineDisableRemaining.config.allSpecsDynamic.disableSpecs = true;
```

Use this if you want to disable all tests after the first fail.
It must be set before the spec you're interested in.

Typically, you would put it in a `beforeAll`.
You can also just set it in `config.onPrepare`.

#### Disable all remaining specs _in a file_

Turn on using (typically in a `beforeAll`)

```js
    browser.params.jasmineDisableRemainingReporter.jasmineDisableRemaining.config.allFileSpecsDynamic.disableSpecs = true;
```

Turn off using (typically in a `afterAll`)

```js
    browser.params.jasmineDisableRemainingReporter.jasmineDisableRemaining.config.allFileSpecsDynamic.disableSpecs = false;
```

Use this if you want to disable all tests in a file after the first fail.
It must be set before the spec you're interested in.
**_Please note_** this setting is global.
It must be turned off so it doesn't affect other files.

**TL; DR**: if you don't turn this off, all remaining files will have this turned on.

You can also just set it in `config.onPrepare` and then for any file with a failure,
all remaining specs _in that file_ will be disabled.

### Advanced

By default, when using "Disable all remaining specs _in a file_", disabling of `afterAllFns` and `afterFns` is turned off,
so that those functions are not disabled.
This is because it is assumed that by default, there may be essential cleanup that may need to happen.

If you turn these on so that the become disabled, just remember that you won't be able to turn off any settings after a fail.

## Changelog / Release History

See [CHANGELOG.md](CHANGELOG.md).

## Thanks

Thanks for the idea https://github.com/Updater/jasmine-fail-fast
