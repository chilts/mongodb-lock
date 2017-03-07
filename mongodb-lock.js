/**
 *
 * mongodb-lock.js - Use your existing MongoDB as a local lock.
 *
 * Copyright (c) 2015 Andrew Chilton
 * - http://chilts.org/
 * - andychilton@gmail.com
 *
 * License: http://chilts.mit-license.org/2015/
 *
**/

var crypto = require('crypto')

// some helper functions
function id() {
  return crypto.randomBytes(16).toString('hex')
}

module.exports = function(mongoDbClient, collectionName, lockName, opts) {
  return new Lock(mongoDbClient, collectionName, lockName, opts)
}

// the Lock object itself
function Lock(mongoDbClient, collectionName, lockName, opts) {
  if ( !mongoDbClient ) {
    throw new Error("mongodb-lock: provide a mongodb.MongoClient")
  }
  if ( !collectionName ) {
    throw new Error("mongodb-lock: provide a collectionName")
  }
  if ( !lockName ) {
    throw new Error("mongodb-lock: provide a lockName")
  }
  opts = opts || {}

  var self = this

  self.col = mongoDbClient.collection(collectionName)
  self.name = lockName
  self.timeout = opts.timeout || 30 * 1000 // default: 30 seconds
  // Whether we want to remove old lock records or just modify them
  self.removeExpired = opts.removeExpired || false
}

Lock.prototype.ensureIndexes = function(callback) {
  var self = this

  self.col.ensureIndex({ name : 1 }, { unique : true }, function(err) {
    if (err) return callback(err)
    callback()
  })
}

Lock.prototype.acquire = function(callback) {
  var self = this

  var now = Date.now()

  // firstly, expire any locks if they have timed out
  var q1 = {
    name   : self.name,
    expire : { $lt : now },
  }
  var u1 = {
    $set : {
      name    : self.name + ':' + now,
      expired : now,
    },
  }

  handleExpiredLocks(self, q1, undefined /* sort order */, u1, function(err, oldLock) {
    if (err) return callback(err)

    // now, try and insert a new lock
    var code = id()
    var doc = {
      name     : self.name,
      code     : code,
      expire   : now + self.timeout,
      inserted : now,
    }

    self.col.insert(doc, function(err, docs) {
      if (err) {
        if (err.code === 11000 ) {
          // there is currently a valid lock in the datastore
          return callback(null, null)
        }
        // don't know what this error is
        return callback(err)
      }

      callback(null, docs.ops ? docs.ops[0].code : docs[0].code)
    })
  })
}

Lock.prototype.release = function release(code, callback) {
  var self = this

  var now = Date.now()

  // expire this lock if it is still valid
  var q1 = {
    code    : code,
    expire  : { $gt : now },
    expired : { $exists : false },
  }
  var u1 = {
    $set : {
      name    : self.name + ':' + now,
      expired : now,
    },
  }
  handleExpiredLocks(self, q1, undefined /* sort order */, u1, function(err, oldDoc) {
    if (err) return callback(err)

    if(oldDoc && oldDoc.hasOwnProperty('value') && !oldDoc.value) {
      return callback(null, false);
    }

    if (!oldDoc) {
      // there was nothing to unlock
      return callback(null, false)
    }

    // unlocked correctly
    return callback(null, true)
  })
}

function handleExpiredLocks(lock, query, sortOrder, update, callback) {
  if (lock.removeExpired) {
    return lock.col.findAndRemove(query, sortOrder, callback)
  }
  return lock.col.findAndModify(query, sortOrder, update, callback)
}
