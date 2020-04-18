const tool = filename => require('../tools/' + filename);

const mongoose = require('mongoose');
const models = require('./models').models;
const {sortBy} = require('./modelTools');
const modelFields = require('./modelTools/fields');

const tools = [
  'createModelRoutes',
  'getDateValues',
  'getLocationValues',
  'getNewEventValues',
  'removeDuplicatesFromList',
  'reorderList',
  'sortEvents',
];

module.exports = {
  mongoose,
  sortBy,
  modelFields,
};

models.forEach(model => {
  module.exports[model] = mongoose.model(model);
});

tools.forEach(tool => {
  module.exports[tool] = require('./tools/' + tool);
});
