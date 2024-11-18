const e = require("express")
const proxy = require('express-http-proxy');
const app = e()
const {Client} = require("pg")
const {createClient} = require("redis")
const cacheTime = /* Seconds */ 10*/* Ignore this */1000

let lastCachedUsers

const client = new Client({
    host: "db",
    port: 5432,
    user: "postgres",
    password: "password",
    database: "postgres"
})

const redisDB = createClient({
    url: "redis://cache:6379",
})

client.connect()
redisDB.connect()

app.get("/", (req, res) => {
    res.send("Hello World")
})

app.get("/api/get", async (req, res) => {
    console.log(lastCachedUsers == undefined ? "" : "Cache time remaining:", lastCachedUsers == undefined ? "No cache existing" : (lastCachedUsers + cacheTime - Date.now())/1000 + " Seconds")
    if (await redisDB.get("users")) {
        if (lastCachedUsers + cacheTime > Date.now()) {
            let mod = {result: JSON.parse(await redisDB.get("users")), cached: true}
            return res.status(200).send(mod)
        }
    }
    client.query("SELECT * FROM users", async (err, result) =>  {
        if (err) {
            console.log(err)
            res.status(500).send(err)
        } else {
            let mod = {result: result.rows, cached: false}
            res.status(200).send(mod)
            await redisDB.set("users", JSON.stringify(result.rows))
            lastCachedUsers = Date.now()
        }
    })
})

app.get("/api/registerUser", (req, res) => {
    client.query("INSERT INTO users (name, email) VALUES ($1, $2)", [req.query.name, req.query.email], (err, result) => {
        if (err) {
            console.log(err)
            res.status(500).send(err)
        } else {
            res.status(200).send(result.rows)
        }
    })
})

app.get("/api/initTable", (req, res) => {
    client.query("CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name VARCHAR(255), email VARCHAR(255))", (err, result) => {
        if (err) {
            console.log(err)
            res.status(500).send(err)
        } else {
            res.status(200).send(result.rows)
        }
    })
})

//app.use("/app", proxy("app:4000"))

const port = 3000

app.listen(port, () => {
    console.log("Server is running on port", port)
})

module.exports = app