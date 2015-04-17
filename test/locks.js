// var async = require('async')
var test = require('tape')

var setup = require('./setup.js')
var mongoDbLock = require('../')

var codeRegexp = new RegExp(/^[0-9a-f]{32}$/)

setup(function(db) {

  test("test ensureIndexes works fine", function(t) {
    t.plan(3)

    // the lock name in this case doesn't matter, since we're not going to acquire this one
    var lock = mongoDbLock(db, 'locks', 'whatever')
    t.ok(lock, 'Lock object created ok')

    lock.ensureIndexes(function(err, result) {
      t.ok(!err, 'There was no error when acquring the lock')
      t.ok(!result, 'Nothing else is returned (nor should it be)')
    })
  })

  test("test that the lock can't be acquired twice", function(t) {
    t.plan(5)

    var lock = mongoDbLock(db, 'locks', 'thisLock')
    t.ok(lock, 'Lock object created ok')

    lock.acquire(function(err, code) {
      t.ok(!err, 'There was no error when acquring the lock')
      t.ok(code.match(codeRegexp), 'The lock code returned matches the code regexp')

      // see if we can get this lock again
      lock.acquire(function(err, code) {
        t.ok(!err, 'There was no error trying to lock again (even though it is already locked)')
        t.ok(!code, 'However, no code was returned since the lock was not acquired')
      })
    })
  })

  test("test that the lock is released correctly", function(t) {
    t.plan(5)

    var lock = mongoDbLock(db, 'locks', 'another-lock')
    t.ok(lock, 'Lock object created ok')

    lock.acquire(function(err, code) {
      t.ok(!err, 'There was no error when acquring the lock')
      t.ok(code.match(codeRegexp), 'The lock code returned matches the code regexp')

      // see if we can get this lock again
      lock.acquire(function(err, code) {
        t.ok(!err, 'There was no error trying to lock again (even though it is already locked)')
        t.ok(!code, 'However, no code was returned since the lock was not acquired')
      })
    })
  })

  test("test that two locks are fine to acquire together", function(t) {
    t.plan(4)

    var lock1 = mongoDbLock(db, 'locks', 'lock-1')
    var lock2 = mongoDbLock(db, 'locks', 'lock-2')

    lock1.acquire(function(err, code) {
      t.ok(!err, '1. There was no error when acquring the lock')
      t.ok(code.match(codeRegexp), '1. The lock code returned matches the code regexp')
    })
    lock2.acquire(function(err, code) {
      t.ok(!err, '2. There was no error when acquring the lock')
      t.ok(code.match(codeRegexp), '2. The lock code returned matches the code regexp')
    })
  })

  test("test that a 3s lock is released automatically", function(t) {
    t.plan(5)

    var threeSecs = 3 * 1000
    var lock = mongoDbLock(db, 'locks', 'three-secs', { timeout : threeSecs })

    lock.acquire(function(err, code1) {
      t.ok(!err, '1. There was no error when acquring the lock')
      t.ok(code1.match(codeRegexp), '1. The lock code returned matches the code regexp')

      setTimeout(function() {
        lock.acquire(function(err, code2) {
          t.ok(!err, '2. There was no error when acquring the lock')
          t.ok(code2.match(codeRegexp), '2. The lock code returned matches the code regexp')
          t.ok(code1 !== code2, '2. The 2nd code generated is different from the first')
        })
      }, threeSecs + 100)
    })
  })

  test("test that a 3s lock can be released and then re-acquired", function(t) {
    t.plan(7)

    var threeSecs = 3 * 1000
    var lock = mongoDbLock(db, 'locks', 'release-me', { timeout : threeSecs })

    lock.acquire(function(err, code1) {
      t.ok(!err, '1. There was no error when acquring the lock')
      t.ok(code1.match(codeRegexp), '1. The lock code returned matches the code regexp')

      lock.release(code1, function(err, ok) {
        t.ok(!err, 'No error when releasing this lock')
        t.ok(ok, 'The lock was released correctly')

        // re-acquire this lock since it has been released
        lock.acquire(function(err, code2) {
          t.ok(!err, '2. There was no error when acquring the lock')
          t.ok(code2.match(codeRegexp), '2. The lock code returned matches the code regexp')
          t.ok(code1 !== code2, '2. The 2nd code generated is different from the first')
        })
      })
    })
  })

  test("test that when a 3s is released automatically, the release fails properly", function(t) {
    t.plan(4)

    var threeSecs = 3 * 1000
    var lock = mongoDbLock(db, 'locks', 'bad-release', { timeout : threeSecs })

    lock.acquire(function(err, code) {
      t.ok(!err, 'There was no error when acquring the lock')
      t.ok(code.match(codeRegexp), 'The lock code returned matches the code regexp')

      setTimeout(function() {
        lock.release(code, function(err, ok) {
          t.ok(!err, 'There was no error releasing the expired lock, ie. the operation succeeded')
          t.ok(!ok, 'The lock was not released (as expected)')
        })
      }, threeSecs + 100)
    })
  })

  test('db.close()', function(t) {
    t.pass('db.close()')
    db.close()
    t.end()
  })

})
