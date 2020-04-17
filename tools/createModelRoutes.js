const mongoose = require('mongoose');
const reorderList = require('./reorderList');
const getDateValues = require('./getDateValues');
const getLocationValues = require('./getLocationValues');

function createModelRoutes(specs) {
  new ModelRoutes(specs);
}

class ModelRoutes {
  constructor(specs) {
    this.router = specs.router;
    this.Model = specs.Model;
    this.modelName = specs.modelName;
    this.modelNamePlural = specs.modelNamePlural || (specs.modelName + 's');
    this.redirectTo = '';

    if (specs.editView !== false) {
      this.redirectTo = '/edit';
    }

    let basePathGet = '/' + this.modelName + '/:id/';

    if (specs.index) {
      this.router.get('/' + this.modelNamePlural, specs.index);
    }

    if (specs.new) {
      this.router.get('/' + this.modelNamePlural + '/new', specs.new);
    }

    if (specs.create) {
      this.router.post('/' + this.modelNamePlural + '/new', specs.create);
    }

    if (specs.show) {
      this.router.get(basePathGet, specs.show);
    }

    if (specs.edit) {
      this.router.get(basePathGet + 'edit', specs.edit);
    }

    if (specs.delete) {
      this.router.post('/' + this.modelName + '/:id/delete', specs.delete);
    }

    if (specs.otherRoutes) {
      for (let path in specs.otherRoutes) {
        this.router.get(basePathGet + path, specs.otherRoutes[path]);
      }
    }

    if (specs.fields) {
      specs.fields.forEach(field => {
        if (field.multi) {
          this.addListAttribute(field.name);
          this.deleteListAttribute(field.name);
          this.reorderListAttribute(field.name);
        } else if (field.toggle) {
          this.toggleAttribute(field.name);
        } else {
          this.updateAttribute(field.name);
        }
      });
    }

    if (specs.toggleAttributes) {
      specs.toggleAttributes.forEach(fieldName => {
        this.toggleAttribute(fieldName);
      });
    }

    if (specs.singleAttributes) {
      specs.singleAttributes.forEach(fieldName => {
        this.updateAttribute(fieldName);
      });
    }

    if (specs.listAttributes) {
      specs.listAttributes.forEach(fieldName => {
        this.addListAttribute(fieldName);
        this.deleteListAttribute(fieldName);
        this.reorderListAttribute(fieldName);
      });
    }
  }

  postEdit(fieldName, callback) {
    this.router.post('/' + this.modelName + '/:id/edit/' + fieldName, callback);
  }

  updateAndRedirect(req, res, item, itemId, updatedObj, fieldName) {
    item.update(updatedObj, err => {
      let redirectId;

      if (this.modelName == 'person') {
        if (fieldName == 'customId') {
          redirectId = updatedObj.customId;
        } else {
          redirectId = req.paramPersonId;
        }
      } else {
        redirectId = itemId;
      }

      res.redirect('/' + this.modelName + '/' + redirectId + this.redirectTo);
    });
  }

  withItem(req, callback) {
    const itemId = req.params.id;
    this.Model.findById(itemId, (err, item) => {
      if (!item && this.modelName == 'person') {
        this.Model.find({ customId: itemId }, (err, item) => {
          callback(item[0], itemId);
        });
      } else {
        callback(item, itemId);
      }
    });
  }

  toggleAttribute(fieldName) {
    this.postEdit(fieldName, (req, res, next) => {
      this.withItem(req, (item, itemId) => {
        const updatedObj = {};
        if (fieldName == 'shareLevel') {
          updatedObj.sharing = item.sharing;
          updatedObj.sharing.level += 1;
          if (updatedObj.sharing.level == 3) {
            updatedObj.sharing.level = 0;
          }
        } else {
          const currentValue = item[fieldName] || false;
          updatedObj[fieldName] = !currentValue;
        }
        this.updateAndRedirect(req, res, item, itemId, updatedObj);
      });
    });
  }

  updateAttribute(fieldName) {
    this.postEdit(fieldName, (req, res, next) => {
      this.withItem(req, (item, itemId) => {
        const updatedObj = {};
        if (fieldName == 'date') {
          updatedObj[fieldName] = getDateValues(req);
        } else if (fieldName == 'location') {
          updatedObj[fieldName] = getLocationValues(req);
        } else {
          updatedObj[fieldName] = req.body[fieldName];
        }
        if (['story', 'source'].includes(fieldName)
            && ['0', ''].includes(updatedObj[fieldName])) {
          updatedObj[fieldName] = null;
        }
        this.updateAndRedirect(req, res, item, itemId, updatedObj, fieldName);
      });
    });
  }

  addListAttribute(fieldName) {
    const routePath = '/' + this.modelName + '/:id/add/' + fieldName;
    this.router.post(routePath, (req, res, next) => {
      const newValue = req.body[fieldName].trim();
      if (newValue == '') {
        return;
      }
      new Promise(resolve => {
        if (fieldName == 'images') {
          const newVals = { url: newValue };
          mongoose.model('Image').create(newVals, (err, newObject) => {
            resolve(newObject);
          });
        } else {
          resolve(newValue);
        }
      }).then(newItem => {
        this.withItem(req, (item, itemId) => {
          const updatedObj = {};
          updatedObj[fieldName] = (item[fieldName] || []).concat(newItem);
          this.updateAndRedirect(req, res, item, itemId, updatedObj);
        });
      });
    });
  }

  deleteListAttribute(fieldName) {
    const routePath = '/' + this.modelName + '/:id/delete/' + fieldName + '/:deleteId';
    this.router.post(routePath, (req, res, next) => {
      this.withItem(req, (item, itemId) => {
        const updatedObj = {};
        const deleteId = req.params.deleteId;

        if (['people', 'stories', 'images'].includes(fieldName)) {
          updatedObj[fieldName] = item[fieldName].filter(item => {
            return ('' + (item._id || item)) != deleteId;
          });
        } else {
          updatedObj[fieldName] = item[fieldName].filter((item, i) => {
            return i != deleteId;
          });
        }

        new Promise(resolve => {
          if (fieldName == 'images') {
            mongoose.model('Image').findById(deleteId).exec((err, image) => {
              image.remove(resolve);
            });
          } else {
            resolve();
          }
        }).then(() => {
          this.updateAndRedirect(req, res, item, itemId, updatedObj);
        });
      });
    });
  }

  reorderListAttribute(fieldName) {
    const routePath = '/' + this.modelName + '/:id/reorder/' + fieldName + '/:orderId';
    this.router.post(routePath, (req, res, next) => {
      this.withItem(req, (item, itemId) => {
        const updatedObj = {};
        const orderId = req.params.orderId;
        updatedObj[fieldName] = reorderList(item[fieldName], orderId, fieldName);
        this.updateAndRedirect(req, res, item, itemId, updatedObj);
      });
    });
  }
}

module.exports = createModelRoutes;
