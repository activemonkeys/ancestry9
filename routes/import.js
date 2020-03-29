const tool = filename => require('../tools/' + filename);

const mongoose = require('mongoose');

const models = [
  'Citation',
  'Event',
  'Notation',
  'Person',
  'Source',
  'Story',
];

const tools = [
  'createModelRoutes',
  'getDateValues',
  'getLocationValues',
  'getNewEventValues',
  'removeDuplicatesFromList',
  'reorderList',
  'sortCitations',
  'sortEvents',
];

module.exports = {
  mongoose,
};

models.forEach(model => {
  module.exports[model] = mongoose.model(model);
});

tools.forEach(tool => {
  module.exports[tool] = require('../tools/' + tool);
});
