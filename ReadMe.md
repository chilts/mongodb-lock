# mongodb-lock #

[![Build Status](https://travis-ci.org/chilts/mongodb-lock.png)](https://travis-ci.org/chilts/mongodb-lock)
[![NPM](https://nodei.co/npm/mongodb-lock.png?mini=true)](https://nodei.co/npm/mongodb-lock/)

A really light-weight way to get distributed locks with a nice API if you're already using MongoDB.

## Version 1.0 ##

Please note that the API has changed for v1.0 (compared to v0.4 and previously). This fits in with
[MongoDB](https://www.npmjs.com/package/mongodb) v3 and above.

## Synopsis ##

Create a connection to your MongoDB database, and use it to create a lock object:

```js
const mongodb = require('mongodb')
const mongoDbLock = require('.')

const url = 'mongodb://localhost:27017/'
const dbName = 'test'
const colName = 'locks'
const lockName = 'database-backup'

mongodb.MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
  const db = client.db(dbName)
  const col = db.collection(colName)

  // supply the collection to use and the lock name
  const lock = mongoDbLock(col, lockName)
  lock.ensureIndexes(function(err, result) {
    console.log('Ensured Index:', err, result)
  })

  // Your Program Here!

})
```

Now, acquire the lock:

```js
lock.acquire((err, code) => {
  if (err) {
    return console.error(err)
  }

  if ( !code ) {
    // lock was not acquired
    console.log('code=' + code)
    return
  }

  // lock was acquired
})
```

Once you have a lock, you have a 30 second timeout until the lock is released. You can release it earlier by supplying the code:

```js
lock.release(code, (err, ok) => {
  if (err) {
    return console.error(err)
  }

  if (!ok) {
    console.log("Lock was not released, perhaps it's already been released or timed out")
    return
  }

  console.log('Lock released ok')
})
```

## MongoDB Indexes ##

You should make sure any indexes have been added to the collection to make the queries faster:

```js
lock.ensureIndexes(err => {
  if (err) {
    return console.error(err)
  }
  // all ok
})
```

## Multiple Locks ##

Multiple locks can use the same collection and operate quite independently:

```js
const dbBackupLock = mongoDbLock(db, 'locks', 'database-backup')
const hourlyStats = mongoDbLock(db, 'locks', 'hourly-stats')
const sendInvoices = mongoDbLock(db, 'locks', 'send-invoices')
```

## Options ##

Currently there are two options: `timeout` and `removeExpired`

### timeout ###

Currently the default is 30 seconds, but you can change it (in milliseconds):

```js
// lock for 60 seconds
const opts = { timeout : 60 * 1000 }

// create the lock object
const uploadFiles = mongoDbLock(db, 'locks', 'upload-files', opts)

// acquire the lock
uploadFiles.lock((err, code) => {
  // locked for 60s
})
```

### removeExpired ###

Currently the default value is `false`.

When set to `true` this will remove expired lock records from MongoDB instead of modifying them.

```js
// remove old locks from MongoDB
const opts = { removeExpired : true }

// create the lock object
const cleanUpCacheDirs = mongoDbLock(db, 'locks', 'clean-up-cache-dirs', opts)

// all old locks are now deleted, rather than just hanging around
```

## Changelog ##

### 1.0.0 (2019-08-08) ###

* [FIX] made sure MongoDB Lock works with the MongoDB driver >v3
* Yay - v1.0.0!

### 0.4.0 (2017-03-07) ###

* Allow option so old locks are removed rather than updated (thanks Aiden Keating)

### 0.3.0 (2017-03-07) ###

* Support for the MongoDB Driver v2 (thanks Aiden Keating)
* Better ReadMe (thanks Marek)
* Better ReadMe (thanks Krasiyan Nedelchev)

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
