# mongodb-lock #

[![Build Status](https://travis-ci.org/chilts/mongodb-lock.png)](https://travis-ci.org/chilts/mongodb-lock)
[![NPM](https://nodei.co/npm/mongodb-lock.png?mini=true)](https://nodei.co/npm/mongodb-lock/)

A really light-weight way to get distributed locks with a nice API if you're already using MongoDB.
## Synopsis ##

Create a connection to your MongoDB database, and use it to create a lock object:

```js
var mongodb = require('mongodb')
var mongoDbLock = require('mongodb-lock')

var con = 'mongodb://localhost:27017/test'

mongodb.MongoClient.connect(con, function(err, db) {
  // supply the database, the collection to use and the lock name
  var lock = mongoDbLock(db, 'locks', 'database-backup')
})
```

Now, acquire the lock:

```js
lock.acquire(function(err, code) {
  if (err) {
    return console.error(code)
  }

  if ( code ) {
    // lock was acquired
    console.log('code=' + code)
  }
  else {
    // lock was not acquired
  }
})
```

Once you have a lock, you have a 30 second timeout until the lock is released. You can release it earlier by supplying the code:

```js
lock.release(code, function(err, ok) {
  if (err) {
    return console.error(err)
  }

  if (ok) {
    console.log('Lock released ok')
  }
  else {
    console.log("Lock was not released, perhaps it's already been released or timed out")
  }
})
```

## MongoDB Indexes ##

You should make sure any indexes have been added to the collection to make the queries faster:

```js
lock.ensureIndexes(function(err) {
  if (err) {
    return console.error(err)
  }
  // all ok
})
```

## Multiple Locks ##

Multiple locks can use the same collection and operate quite independently:

```js
var dbBackupLock = mongoDbLock(db, 'locks', 'database-backup')
var hourlyStats = mongoDbLock(db, 'locks', 'hourly-stats')
var sendInvoices = mongoDbLock(db, 'locks', 'send-invoices')
```

## Options ##

Currently there are two options: `timeout` and `removeExpired`

### timeout ###
Currently the default is 30 seconds, but you can change it (in milliseconds):

```js
// lock for 60 seconds
var uploadFiles = mongoDbLock(db, 'locks', 'upload-files', { timeout : 60 * 1000})

uploadFiles.lock(function(err, code) {
  // locked for 60s
})
```

### removeExpired
Currently the default value is `false`.

When set to `true` this will remove expired lock records from MongoDB instead 
of modifying them.


### 0.2.0 (2015-04-17) ###

* [FIX] made sure that a 2nd .release() doesn't return ok (ie. it didn't do anything)

### 0.1.0 (2015-04-17) ###

* [NEW] added ability to add indexes to MongoDB
* [NEW] added lock()
* [NEW] added release()

## Author ##

Written by [Andrew Chilton](http://chilts.org/) -
[Twitter](https://twitter.com/andychilton).

## License ##

MIT - http://chilts.mit-license.org/2014/

(Ends)
