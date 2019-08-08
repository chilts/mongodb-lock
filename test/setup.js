const mongodb = require('mongodb')

const conStr = 'mongodb://localhost:27017/'
const dbName = 'mongodb-lock'

const collections = [
  'default', 'locks', 'lock2',
]

module.exports = function(callback) {
  mongodb.MongoClient.connect(conStr, (err, client) => {
    if (err) throw err

    const db = client.db(dbName)

    // let's empty out some collections to make sure there are no messages
    let done = 0
    collections.forEach(col => {
      db.collection(col).deleteMany(() => {
        done += 1
        if ( done === collections.length ) {
          callback(client, db)
        }
      })
    })
  })
}
