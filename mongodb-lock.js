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

module.exports = function(col, lockName, opts) {
  return new Lock(col, lockName, opts)
}

// the Lock object itself
function Lock(col, lockName, opts) {
  if ( !col ) {
    throw new Error("mongodb-lock: provide a collection")
  }
  if ( !lockName ) {
    throw new Error("mongodb-lock: provide a lockName")
  }
  opts = opts || {}

  this.col = col
  this.name = lockName
  this.timeout = opts.timeout || 30 * 1000 // default: 30 seconds

  // Whether we want to remove old lock records or just modify them.
  this.removeExpired = opts.removeExpired || false
}

Lock.prototype.ensureIndexes = function(callback) {
  const indexes = [
    {
      name: 'name',
      key: {
        name: 1,
      },
      unique: true,
    }
  ]
  this.col.createIndexes(indexes, { unique : true }, callback)
}

Lock.prototype.acquire = function(callback) {
  var now = Date.now()

  // firstly, expire any locks if they have timed out
  var query = {
    name   : this.name,
    expire : { $lt : now },
  }
  var update = {
    $set : {
      name    : this.name + ':' + now,
      expired : now,
    },
  }

  this.handleExpiredLocks(query, update, (err, oldLock) => {
    if (err) return callback(err)

    // now, try and insert a new lock
    var code = id()
    var doc = {
      name     : this.name,
      code     : code,
      expire   : now + this.timeout,
      inserted : now,
    }

    this.col.insertOne(doc, (err, docs) => {
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
  var now = Date.now()

  // expire this lock if it is still valid
  var query = {
    code    : code,
    expire  : { $gt : now },
    expired : { $exists : false },
  }
  var update = {
    $set : {
      name    : this.name + ':' + now,
      expired : now,
    },
  }

  this.handleExpiredLocks(query, update, (err, oldLock) => {
    if (err) return callback(err)

    if(oldLock && oldLock.hasOwnProperty('value') && !oldLock.value) {
      return callback(null, false);
    }

    if (!oldLock) {
      // there was nothing to unlock
      return callback(null, false)
    }

    // unlocked correctly
    return callback(null, true)
  })
}

Lock.prototype.handleExpiredLocks = function handleExpiredLocks(query, update, callback) {
  if (this.removeExpired) {
    this.col.findOneAndDelete(query, callback)
    return
  }
  this.col.findOneAndUpdate(query, update, callback)
}
