const { pool } = require("../config/db.config");

async function fetchSocialLinks() {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT * FROM social_links LIMIT 1");
    // console.log(result.rows[0]);
    return result.rows[0]; // assuming there's only one row in the table
  } catch (err) {
    console.error(err);
    return null;
  } finally {
    client.release();
  }
}

module.exports = fetchSocialLinks;
