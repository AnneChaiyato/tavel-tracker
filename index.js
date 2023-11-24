import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";

const app = express();
const port = process.env.PORT || 3000;
app.set("port", process.env.PORT || 3000);
dotenv.config();

const db = new pg.Client({
  connectionString: process.env.DBConnLink,
  ssl: {
    rejectUnauthorized: false
  }
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

db.connect();

app.get("/", async (req, res) => {
  var visited_countries = await get_visited_countries(); 
  res.render("index.ejs", {
    countries: visited_countries,
    total: visited_countries.length
  });
});

app.post("/submit", async (req, res) => {

  const country = req.body["country"].trim();
  console.log(country);
  const action = req.body.action;
  if (country === "") {
    res.redirect("/");
  } else {
    if(action === "add") {
      try {
        const country_code_query = await db.query("SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%'", [country.toLowerCase()]);
        const country_code = country_code_query.rows[0].country_code;
        const err = await insert_visited_country(country_code);
        if (err) {
          var visited_countries = await get_visited_countries();
          res.render("index.ejs", {
            countries: visited_countries,
            total: visited_countries.length,
            error: "This country has already been added. Try again."
          });
        } else {
          res.redirect("/");
        }
      } catch (e) {
        console.log("Error with querying countries table", e.stack)
        var visited_countries = await get_visited_countries();
          res.render("index.ejs", {
            countries: visited_countries,
            total: visited_countries.length,
            error: "This country does not exist. Try again."
          });
      }
    } else {
      try {
        const country_code_query = await db.query("SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%'", [country.toLowerCase()]);
        const country_code = country_code_query.rows[0].country_code;
        const err = await remove_visited_country(country_code);

        if(err) {
          const visited_countries = get_visited_countries();
          res.render("index.ejs", {
            countries: visited_countries,
            total: visited_countries.length,
            error: "You haven't been to this country. Please try again."
          });
        } else {
          res.redirect("/");
        }
      } catch(e) {
        console.log("Error with querying country_code", e.stack);
        var visited_countries = await get_visited_countries();
        res.render("index.ejs", {
            countries: visited_countries,
            total: visited_countries.length,
            error: "This country does not exist. Try again."
        });
      }
    }
  }
});

async function insert_visited_country(country_code) {
  try {
    const result = await db.query("INSERT INTO visited_countries (country_code) VALUES ($1)", [country_code]);
    return null;
  } catch (e){
    console.log("Error with inserting to visited_countries table", e.stack)
    return e;
  }
}

async function remove_visited_country(country_code) {
  try {
    const result = await db.query("DELETE FROM visited_countries WHERE country_code=$1", [country_code]);
    return null;
  } catch (e) {
    console.log("Error with deleting a country code.", e.stack);
    return e;
  }
}

async function get_visited_countries() {
  try {
    const result = await db.query("SELECT country_code FROM visited_countries");
    return result.rows.map((obj) => obj.country_code);
  } catch (e) {
    console.log("Error with querying data", e.stack)
    return [];
  }
}

app.listen(app.get("port"), () => {
  console.log(`Server running on http://localhost:${port}`);
});
