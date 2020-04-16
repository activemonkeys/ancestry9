const {
  Citation,
  Source,
} = require('../import');

module.exports = createRoutes;

function createRoutes(router) {
  router.param('citationId', convertParamCitationId);
  router.post('/source/:sourceId/add/citations', createCitation);
  router.post('/source/:sourceId/edit/citations/:citationId', updateCitation);
  router.post('/source/:sourceId/delete/citations/:citationId', deleteCitation);
}

async function createCitation(req, res) {
  const newCitation = getCitationValues(req);

  const citation = await Citation.create(newCitation);

  if (req.body.fastCitations) {
    res.redirect('/source/' + req.sourceId + '/fastCitations');
  } else {
    res.redirect('/source/' + req.sourceId + '/edit');
  }
}

async function updateCitation(req, res) {
  const updatedItem = getCitationValues(req);
  if (!updatedItem) {
    // Data is invalid; page spins. Has actually proven to be convenient.
    return;
  }
  await req.citation.update(updatedItem);
  res.redirect('/source/' + req.sourceId + '/edit');
}

async function deleteCitation(req, res) {
  await req.citation.delete();
  res.redirect('/source/' + req.sourceId + '/edit');
}

async function convertParamCitationId(req, res, next, citationId) {
  req.citationId = citationId;
  req.citation = await Citation.findById(citationId);
  next();
}

function getCitationValues(req) {
  const citationValues = {
    source: req.sourceId,
    person: req.body.person,
    item: req.body.item.trim(),
    information: req.body.information.trim(),
  };

  if (citationValues.item == '' || citationValues.information == ''
      || citationValues.person == '0') {
    return false;
  }

  return citationValues;
}
