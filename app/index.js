const e = require("express")
const app = e()

app.get("/", (req, res) => {
    res.send("Hello World")
})

app.get("/hi", (req, res) => {
    
})

app.listen(4000)

module.exports = app