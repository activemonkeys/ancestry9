var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var removePersonFromList = require('../tools/removePersonFromList');

router.get('/:sourceId', makeSourceShowRoute('none'));

makeSourcesRoutes('Title', 'title');
makeSourcesRoutes('Date', 'date');
makeSourcesRoutes('Person', 'people', true);
makeSourcesRoutes('Link', 'links', true);
makeSourcesRoutes('Image', 'images', true);

makeSourcesRoutes('Citation', 'citations', true);

module.exports = router;

function makeSourcesRoutes(urlName, fieldName, canDelete) {
  if (canDelete) {
    var showOrEditPath = '/:sourceId/add' + urlName;
    var deletePath = '/:sourceId/delete' + urlName + '/:deleteId';
    router.get(showOrEditPath, makeSourceShowRoute(fieldName));
    router.post(showOrEditPath, makeSourcePostRoute(fieldName));
    router.post(deletePath, makeSourceDeleteRoute(fieldName));
  } else {
    var showOrEditPath = '/:sourceId/edit' + urlName;
    router.get(showOrEditPath, makeSourceShowRoute(fieldName));
    router.post(showOrEditPath, makeSourcePostRoute(fieldName));
  }
}

function makeSourceShowRoute(editField) {
  return function(req, res, next) {
    var sourceId = req.params.sourceId;
    mongoose.model('Source')
    .findById(sourceId)
    .populate('people')
    .exec(function(err, source) {
      mongoose.model('Person')
      .find({})
      .exec(function(err, people) {
        mongoose.model('Citation')
        .find({ source: source })
        .populate('person')
        .exec(function(err, citations) {
          res.format({
            html: function() {
              res.render('sources/show', {
                source: source,
                editField: editField,
                people: people,
                citations: citations,
              });
            }
          });
        });
      });
    });
  };
}

function makeSourcePostRoute(editField) {
  return function(req, res) {
    var sourceId = req.params.sourceId;
    mongoose.model('Source').findById(sourceId, function(err, source) {
      var updatedObj = {};

      if (editField == 'date') {
        updatedObj[editField] = {
          year: req.body.date_year,
          month: req.body.date_month,
          day: req.body.date_day,
        };
      } else if (editField == 'people') {
        var personId = req.body[editField];
        updatedObj[editField] = source.people;
        updatedObj[editField].push(personId);
      } else if (editField == 'links' || editField == 'images') {
        var newValue = req.body[editField].trim();
        if (newValue == '') {
          return;
        }
        updatedObj[editField] = (source[editField] || []).concat(newValue);
      } else if (editField == 'citations') {
        var newItem = {
          item: req.body.item.trim(),
          information: req.body.information.trim(),
          person: req.body.person,
          source: source,
        };

        if (newItem.item == '' || newItem.information == '' || newItem.person == '0') {
          return;
        }

        mongoose.model('Citation').create(newItem, function() { });
      } else {
        updatedObj[editField] = req.body[editField];
      }

      source.update(updatedObj, function(err) {
        res.format({
          html: function() {
            res.redirect('/source/' + sourceId);
          }
        });
      });
    });
  };
}

function makeSourceDeleteRoute(editField) {
  return function(req, res) {
    var sourceId = req.params.sourceId;
    mongoose.model('Source').findById(sourceId, function(err, source) {
      var updatedObj = {};
      var deleteId = req.params.deleteId;

      if (editField == 'people') {
        updatedObj[editField] = removePersonFromList(source[editField], deleteId);
      } else if (editField == 'links' || editField == 'images') {
        updatedObj[editField] = source[editField].filter((url, i) => {
          return i != deleteId;
        });
      }

      source.update(updatedObj, function(err) {
        res.format({
          html: function() {
            res.redirect('/source/' + sourceId);
          }
        });
      });
    });
  };
}