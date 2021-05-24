
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const app = express()
let counter = '0'


app.use(morgan('tiny'));
app.use(cors());
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});

app.get('/tick', async(req, res) => {
  try {
    res.send(counter)
    parseInt(counter)
    counter ++
    counter = counter.toString()
  } catch (err) {
    console.error(err.message)
  }
})
