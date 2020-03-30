const mongoose = require('mongoose');

const personSchema = new mongoose.Schema({
  name: String,
  customId: String,
  parents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
  }],
  spouses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
  }],
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
  }],
  links: [String],
  tags: [String],
  profileImage: String,
  gender: Number,
  sharing: {
    level: { type: Number, default: 0 },
    name: { type: String, default: '' },
  },
});

personSchema.methods.getLifeEvents = getLifeEvents;
personSchema.methods.populateSiblings = populateSiblings;
personSchema.statics.populateAncestors = populateAncestors;
personSchema.statics.findInList = findInList;
personSchema.statics.isSame = isSame;
personSchema.statics.removeFromList = removeFromList;
personSchema.statics.sortByName = sortByName;

const Person = mongoose.model('Person', personSchema);

async function getLifeEvents() {
  const Event = mongoose.model('Event');
  const events = await Event.find({people: this}).populate('people');
  Event.sortByDate(events);
  return events;
}

async function populateSiblings() {
  const done = {};
  done[this._id] = true;

  this.siblings = [];

  for (let parentIndex in this.parents) {
    const parent = this.parents[parentIndex];

    for (let childIndex in parent.children) {
      const childId = parent.children[childIndex];

      if (done[childId]) {
        continue;
      }

      done[childId] = true;
      const sibling = await Person.findById(childId);
      this.siblings.push(sibling);
    }
  }
}

async function populateAncestors(personId, people, safety) {
  safety = safety || 0;

  if (safety > 30) {
    return personId;
  }

  const person = Person.findInList(people, personId);

  for (let i in person.parents) {
    person.parents[i] = await populateAncestors(person.parents[i], people, safety + 1);
  }

  return person;
}

function findInList(people, person) {
  return people.find(nextPerson => isSame(person, nextPerson));
}

function isSame(person1, person2) {
  const id1 = '' + (person1 ? (person1._id || person1) : 'null');
  const id2 = '' + (person2 ? (person2._id || person2) : 'null');
  return id1 === id2;
}

function removeFromList(people, person) {
  return people.filter(nextPerson => !isSame(person, nextPerson));
}

function sortByName(people) {
  people.sort((a, b) => a.name < b.name ? -1 : 1);
}
