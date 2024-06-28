import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";

const app = express();
const port = 3000;
env.config();

const db = new pg.Client({
  user: process.env.USR,
  host: process.env.HO,
  database: process.env.BD,
  password: process.env.WP,
  port:process.env.NO,
});

db.connect();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index.ejs");
});
let movies = [];

app.get("/watchlist.ejs", async (req, res) => {
  try {
    const result = await db.query("Select * from movies");
    movies = result.rows;
    res.render("watchlist.ejs", {
      listTitle: "Your Watchlist",
      listItems: movies,
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/add", async (req, res) => {
    const movie = req.body.newItem;
    try {
      await db.query("INSERT INTO movies(name) VALUES ($1)", [movie]);
      movies.push(movie);
      res.redirect("/watchlist.ejs");
    } catch (err) {
      console.log(err);
    }
  });

app.post("/edit", async (req, res) => {
  const movie = req.body.updatedItemTitle;
  const id = req.body.updatedItemId;

  try {
    await db.query("UPDATE movies SET name = ($1) WHERE id = $2", [movie, id]);
    res.redirect("/watchlist.ejs");
  } catch (err) {
    console.log(err);
  }
});

app.post("/delete", async (req, res) => {
  const id = req.body.deleteItemId;
  try {
    await db.query("DELETE FROM movies WHERE id = $1", [id]);
    res.redirect("/watchlist.ejs");
  } catch (err) {
    console.log(err);
  }
});

function handler(id) {
  document.getElementById("title" + id).setAttribute("hidden", true)
  document.getElementById("edit" + id).setAttribute("hidden", true)
  document.getElementById("done" + id).removeAttribute("hidden")
  document.getElementById("input" + id).removeAttribute("hidden")
}

app.listen(port, () => {
  console.log(`Server running at port ${port}`);
});
