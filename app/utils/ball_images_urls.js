const {pool} = require('../config/db.config');

async function fetchBallImages() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM balls_images ORDER BY created_at DESC');
    const ballImageUrls = result.rows.map(row => row.image_url);
    // console.log(ballImageUrls);
    return ballImageUrls;
  } catch (err) {
    console.error(err);
    return null;
  } finally {
    client.release();
  }
}

module.exports = fetchBallImages;