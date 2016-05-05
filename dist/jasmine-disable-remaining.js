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
                    }
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

            const jasmineDisableRemaining = this.jasmineDisableRemaining;
            const config = jasmineDisableRemaining.config;
            const data = jasmineDisableRemaining.data;
            const topSuite = jasmineDisableRemaining.jasmine.getEnv().topSuite();

            // count all failures per suite
            everyParentSuite(data.specs[result.id].parentSuite, (suite) => {
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

            // type of disable
            if (config.allSpecsByCLI.disableSpecs) {
                disableConfig = config.allSpecsByCLI;
                disableSuite = topSuite;
            } else if (config.allSpecsDynamic.disableSpecs) {
                disableConfig = config.allSpecsDynamic;
                disableSuite = topSuite;
            } else if (config.allFileSpecsDynamic.disableSpecs) {
                disableConfig = config.allFileSpecsDynamic;
                disableSuite = findFileSuite(data.specs[result.id].parentSuite);
            } else {
                return;
            }

            // disable
            disableAllChildren.call(this, disableConfig, disableSuite);

            // log
            if (_.isString(disableConfig.message)) {
                config.log(disableConfig.message);
            } else if (_.isArray(disableConfig.message)) {
                config.log.apply(this, disableConfig.message);
            } else if (_.isArray(disableConfig.defaultMessage)) {
                config.log.apply(this, disableConfig.defaultMessage);
            } else if (_.isString(disableConfig.defaultMessage)) {
                config.log(disableConfig.defaultMessage);
            }

            // callback
            if (_.isFunction(disableConfig.callback)) {
                disableConfig.callback.call(this, this, result, data.specs[result.id]);
            }
        }
    }

    // private methods

    /*
     * Recursively disable all child specs and suites, starting at `startSuite`
     */
    function disableAllChildren(config, startSuite) {
        const _this = this;

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
     * Add `suite` as new property `parentSuite` to `childSpec` and store the spec
     */
    function processSpec(suite, childSpec) {
        childSpec.parentSuite = suite;
        this.jasmineDisableRemaining.data.specs[childSpec.id] = childSpec;
    }

    /*
     * Depth First traverse.
     * Call `callbackForSpecs` for every spec
     * Call `callbackForSuites` for every suite
     */
    function traverseSuiteHierarchy(suite, callbackForSpecs, callbackForSuites) {
        const _this = this;

        if (_.isFunction(callbackForSuites)) {
            callbackForSuites.call(_this, suite);
        }

        suite.children
            .filter((child) => child instanceof _this.jasmineDisableRemaining.jasmine.Suite)
            .forEach((childSuite) => traverseSuiteHierarchy.call(_this, childSuite, callbackForSpecs, callbackForSuites));

        suite.children
            .filter((child) => child instanceof _this.jasmineDisableRemaining.jasmine.Spec)
            .forEach((childSpec) => callbackForSpecs.call(_this, suite, childSpec));
    }

    return JasmineDisableRemaining;
}();
