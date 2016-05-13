'use strict';

/*
 * Purpose:
 * Address missing capability in jasmine to not run any more tests after the first failure.
 * https://github.com/jasmine/jasmine/issues/414
 *
 * Usage:
 *   const JasmineDisableRemaining = require('jasmine-disable-remaining');
 *   ... somewhere the `jasmine` global is now set:
 *   const jasmineDisableRemainingReporter = new JasmineDisableRemaining(jasmine, optionalConfigInit);
 *   jasmine.getEnv().addReporter(jasmineDisableRemainingReporter);
 */


const _ = require('lodash');

module.exports = () => {
    const defaultSuitesMatcherConfig = {
        callback: null,

        // .disableSpecs is intended to be set dynamically, e.g.:
        // it would normally be set to true in a file's beforeAll
        // and set to false in the file's afterAll
        // which would only run if there were no failures
        disableSpecs: false,
        disableSuites: {
            beforeAllFns: true,
            afterAllFns: true,
            beforeFns: true,
            afterFns: true
        },

        // copy the following for your message
        // '\nSpecs have FAILED and specified that all specs in suites matching /YOUR-PATTERN-HERE/ should be disabled',
        defaultMessage: [
            '----------------------------------------------------------------------------------------------',
            '\nSpecs have FAILED and specified that all specs in suites matching a pattern should be disabled',
            '\n----------------------------------------------------------------------------------------------'
        ]
    };

    /*
     * usage for each of the `all*` config properties:
     *   callback - called as: callback.call(this, this, result, spec)
     *   disableSpecs - set to true to disable specs on first spec failure
     *   disableSuites:
     *       beforeAllFns - set to true to disable all "beforeAllFns"
     *       afterAllFns - set to true to disable all "afterAllFns"
     *       beforeFns - set to true to disable all "beforeFns"
     *       afterFns - set to true to disable all "afterFns"
     *   message - can be a string or an array or undefined
     */
    const defaultConfig = {
        allSpecsByCLI: {
            callback: null,

            // allSpecsByCLI.disableSpecs should never be set programatically
            // because it is intended to be set from the command line
            disableSpecs: false,
            disableSuites: {
                beforeAllFns: true,
                afterAllFns: true,
                beforeFns: true,
                afterFns: true
            },
            defaultMessage: [
                '---------------------------------------------------------------------------------------------------',
                '\nThis spec has FAILED. You specified on the command line that all remaining specs should be disabled',
                '\n---------------------------------------------------------------------------------------------------'
            ]
        },
        allSpecsDynamic: {
            callback: null,

            // allSpecsDynamic.disableSpecs is intended to be set dynamically, e.g.:
            // it would normally be set to true in a file's beforeAll
            // and set to false in the file's afterAll
            // which would only run if there were no failures
            disableSpecs: false,
            disableSuites: {
                beforeAllFns: true,
                afterAllFns: true,
                beforeFns: true,
                afterFns: true
            },
            defaultMessage: [
                '-------------------------------------------------------------------------------------',
                '\nThis spec has FAILED and it has specified that all remaining specs should be disabled',
                '\n-------------------------------------------------------------------------------------'
            ]
        },
        allFileSpecsDynamic: {
            callback: null,

            // allSpecsDynamic.disableSpecs is intended to be set dynamically, e.g.:
            // it would normally be set to true in a file's beforeAll
            // and set to false in the file's afterAll
            // which would only run if there were no failures
            disableSpecs: false,
            disableSuites: {
                beforeAllFns: true,
                afterAllFns: false,
                beforeFns: true,
                afterFns: false
            },
            defaultMessage: [
                '--------------------------------------------------------------------------------------------------',
                '\nThis spec has FAILED and it has specified that all remaining specs in this file should be disabled',
                '\n--------------------------------------------------------------------------------------------------'
            ]
        },
        allMatchingSuites: [],
        log: console.log
    };

    class JasmineDisableRemaining {
        constructor(instanceJasmine, optionalConfigInit) {
            // store our controls in a property that should not collide with standard reporter methods
            this.jasmineDisableRemaining = _.merge(
                {
                    jasmine: instanceJasmine,
                    config: defaultConfig,
                    data: {
                        specs: {}
                    },
                    addSuitesMatcher: (match, config) => addSuitesMatcher.call(this, match, config),
                    removeSuitesMatcher: (guid) => removeSuitesMatcher.call(this, guid)
                },
                {
                    config: optionalConfigInit
                }
            );
        }

        // standard jasmine reporter methods

        /*
         * Jasmine calls this method once all describes/its have been "initialized"
         */
        jasmineStarted() {
            traverseSuiteHierarchy.call(this, this.jasmineDisableRemaining.jasmine.getEnv().topSuite(), processSpec);
        }

        /*
         * Called every time a spec is done
         */
        specDone(result) {
            // we only do something with failed specs
            if (result.status !== 'failed') {
                return;
            }

            const _this = this;

            const jasmineDisableRemaining = this.jasmineDisableRemaining;
            const config = jasmineDisableRemaining.config;
            const data = jasmineDisableRemaining.data;
            const topSuite = jasmineDisableRemaining.jasmine.getEnv().topSuite();
            const spec = data.specs[result.id];

            // count all failures per suite
            everyParentSuite(spec.parentSuite, (suite) => {
                if (!_.isObject(suite.result)) {
                    suite.result = {};
                }
                if (!_.isNumber(suite.result.totalSpecFailures)) {
                    suite.result.totalSpecFailures = 1;
                } else {
                    ++suite.result.totalSpecFailures;
                }
            });

            let disableConfig;
            let disableSuite;

            // while you could set multiple of these "disablers", we return because the "alls" would disable all the others anyway
            // disable "all"s
            if (config.allSpecsByCLI.disableSpecs) {
                disableConfig = config.allSpecsByCLI;
                disableSuite = topSuite;
                disableAllChildren.call(this, disableConfig, disableSuite);
                logAfterDisable.call(this, config, disableConfig);
                callbackAfterDisable.call(this, disableConfig);
                return;
            } else if (config.allSpecsDynamic.disableSpecs) {
                disableConfig = config.allSpecsDynamic;
                disableSuite = topSuite;
                disableAllChildren.call(this, disableConfig, disableSuite);
                logAfterDisable.call(this, config, disableConfig);
                callbackAfterDisable.call(this, disableConfig);
                return;
            }

            // disable "all in file"
            if (config.allFileSpecsDynamic.disableSpecs) {
                disableConfig = config.allFileSpecsDynamic;
                disableSuite = findFileSuite(spec.parentSuite);
                disableAllChildren.call(this, disableConfig, disableSuite);
                logAfterDisable.call(this, config, disableConfig);
                callbackAfterDisable.call(this, disableConfig);
            }

            // disable "all matching suites" found
            this.jasmineDisableRemaining.config.allMatchingSuites.forEach((matcher) => {
                let foundMatch = false;

                traverseSuiteHierarchy.call(_this, _this.jasmineDisableRemaining.jasmine.getEnv().topSuite(), null, (suite) => {
                    // since we might have already disabled matchers, make sure they're objects
                    if (matcher && matcher.match && suite.description.match(matcher.match)) {
                        foundMatch = true;
                        disableAllChildren.call(_this, matcher.config, suite);
                    }
                });

                if (foundMatch) {
                    logAfterDisable.call(_this, config, matcher.config);
                    callbackAfterDisable.call(_this, matcher.config);

                    // since we never need to use this matcher again, remove it
                    // plus, disableSuite might cause it to not be called in afterAll
                    removeSuitesMatcher.call(_this, matcher.guid);
                }
            });
        }
    }

    // private methods

    /*
     * Add a new matcher for disabling suites anywhere
     * returns the GUID to remove the matcher
     */
    function addSuitesMatcher(match, argConfig) {
        const _this = this;

        const config = _.merge(
            {},
            defaultSuitesMatcherConfig,
            argConfig
        );

        // naive GUID assumes we're not called async
        const matcher = {
            config,
            guid: _this.jasmineDisableRemaining.config.allMatchingSuites.length,
            match
        };

        _this.jasmineDisableRemaining.config.allMatchingSuites.push(matcher);

        return matcher.guid;
    }

    /*
     */
    function callbackAfterDisable(disableConfig) {
        const _this = this;

        // callback
        if (_.isFunction(disableConfig.callback)) {
            disableConfig.callback.call(_this, _this, result, spec);
        }
    }

    /*
     * Recursively disable all child specs and suites, starting at `startSuite`
     */
    function disableAllChildren(config, startSuite) {
        const _this = this;

        // disable
        traverseSuiteHierarchy.call(
            _this,
            startSuite,
            (suite, childSpec) => disableSpec(childSpec),
            (suite) => disableSuite(config, suite)
        );
    }

    /*
     * Disable spec
     */
    function disableSpec(spec) {
        spec.disable();
    }

    /*
     * Disable suite.
     * Really just means turning off the before/after stuff
     */
    function disableSuite(config, suite) {
        if (config.disableSuites.beforeAllFns) {
            suite.beforeAllFns = [];
        }
        if (config.disableSuites.afterAllFns) {
            suite.afterAllFns = [];
        }
        if (config.disableSuites.beforeFns) {
            suite.beforeFns = [];
        }
        if (config.disableSuites.afterFns) {
            suite.afterFns = [];
        }
    }

    /*
     * Reverse traverse the hierarchy by following `parentSuite`s
     * calling `callbackForSuites` for each suite inclusive
     */
    function everyParentSuite(suite, callbackForSuites) {
        const _this = this;

        if (suite) {
            callbackForSuites.call(_this, suite);
            if (suite.parentSuite) {
                return everyParentSuite(suite.parentSuite, callbackForSuites);
            }
        }
    }

    /*
     * Reverse traverse the hierarchy by following `parentSuite`s
     * Since `jasmine.getEnv().topSuite()` has an undefined `parentSuite`,
     * the hierarchy should look like:
     *   jasmine.getEnv().topSuite()
     *       fileSuite
     *           spec
     *       fileSuite
     *           subSuite
     *               spec
     * Plus, given that we will only be called form `specDone`,
     * we should not have to worry about being called with anything higher than a "fileSuite"
     */
    function findFileSuite(suite) {
        if (suite && suite.parentSuite) {
            if (suite.parentSuite.parentSuite) {
                return findFileSuite(suite.parentSuite);
            } else {
                return suite;
            }
        }
    }

    /*
     */
    function logAfterDisable(config, disableConfig) {
        const _this = this;

        // log
        if (_.isString(disableConfig.message)) {
            config.log(disableConfig.message);
        } else if (_.isArray(disableConfig.message)) {
            config.log.apply(_this, disableConfig.message);
        } else if (_.isArray(disableConfig.defaultMessage)) {
            config.log.apply(_this, disableConfig.defaultMessage);
        } else if (_.isString(disableConfig.defaultMessage)) {
            config.log(disableConfig.defaultMessage);
        }

        // callback
        if (_.isFunction(disableConfig.callback)) {
            config.callback.call(_this, _this, result, spec);
        }
    }

    /*
     * Add `suite` as new property `parentSuite` to `childSpec` and store the spec
     */
    function processSpec(suite, childSpec) {
        childSpec.parentSuite = suite;
        this.jasmineDisableRemaining.data.specs[childSpec.id] = childSpec;
    }

    /*
     * Remove a new matcher
     * To avoid complex GUID generation, keep the array entry, but just null it out
     */
    function removeSuitesMatcher(guid) {
        this.jasmineDisableRemaining.config.allMatchingSuites[guid] = null;
    }

    /*
     * Depth First traverse.
     * Call `callbackForSpecs` for every spec
     * Call `callbackForSuites` for every suite
     */
    function traverseSuiteHierarchy(suite, callbackForSpecs, callbackForSuites) {
        const _this = this;

        if (_.isFunction(callbackForSuites)) {
            if (callbackForSuites) {
                callbackForSuites.call(_this, suite);
            }
        }

        suite.children
            .filter((child) => child instanceof _this.jasmineDisableRemaining.jasmine.Suite)
            .forEach((childSuite) => traverseSuiteHierarchy.call(_this, childSuite, callbackForSpecs, callbackForSuites));

        if (callbackForSpecs) {
            suite.children
                .filter((child) => child instanceof _this.jasmineDisableRemaining.jasmine.Spec)
                .forEach((childSpec) => callbackForSpecs.call(_this, suite, childSpec));
        }
    }

    return JasmineDisableRemaining;
}();
