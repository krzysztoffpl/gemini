'use strict';

const _ = require('lodash');
const SetsBuilder = require('gemini-core').SetsBuilder;
const Suite = require('./suite');
const Events = require('./constants/events');
const testsApi = require('./tests-api');
const utils = require('./utils');
const Promise = require('bluebird');

const DEFAULT_DIR = require('../package').name;

const loadSuites = (sets, emitter, config) => {
    const rootSuite = Suite.create('')

    const files = [];
    _.forEach(sets.groupByFile(), (browsers, filePath) => {
        files.push(Promise.resolve(emitter.emitAndWait(Events.BEFORE_FILE_READ, filePath))
            .then(() => requireTest(rootSuite, browsers, filePath, config))
            .finally(() => {
                return emitter.emitAndWait(Events.AFTER_FILE_READ, filePath);
            }));
    });

    return Promise.all(files).then(()=>rootSuite);
};

module.exports = (emitter, config, opts) => {
    return SetsBuilder
        .create(config.sets, {defaultDir: DEFAULT_DIR})
        .useSets(opts.sets)
        .useFiles(opts.paths)
        .useBrowsers(opts.browsers)
        .build(config.system.projectRoot, {ignore: config.system.exclude})
        .then((setCollection) => loadSuites(setCollection, emitter, config));
};

function requireTest(rootSuite, browsers, filePath, config) {
    global.gemini = testsApi(rootSuite, browsers, filePath, config);
    utils.requireWithNoCache(filePath);
    delete global.gemini;
}
