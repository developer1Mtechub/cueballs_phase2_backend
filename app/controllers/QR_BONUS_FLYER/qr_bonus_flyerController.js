const { pool } = require("../../config/db.config");

exports.createqr_bonus_flyer = async (req, res) => {
  const { bonus_name, start_date, end_date, bonus_coins, qr_image } = req.body;
  const client = await pool.connect();
  try {
    const userData = await pool.query(
      `INSERT INTO qr_bonus_flyer (bonus_name, start_date, end_date, bonus_coins, qr_image) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [bonus_name, start_date, end_date, bonus_coins, qr_image]
    );
    res.status(200).json({
      error: false,
      message: "Message sent successfully",
      data: userData.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: "Internal server error" });
  } finally {
    client.release();
  }
};
// get all qr_bonus_flyer
exports.getAllqr_bonus_flyer = async (req, res) => {
  const client = await pool.connect();
  try {
    const query = "SELECT * FROM qr_bonus_flyer ORDER BY created_at DESC";
    const result = await pool.query(query);
    res
      .status(200)
      .json({ error: false, message: "All qr_bonus_flyer", data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: "Internal server error" });
  } finally {
    client.release();
  }
};
// get all qr_bonus_flyer pagination
exports.getAllqr_bonus_flyerPagination = async (req, res) => {
  const { page, limit } = req.query;
  const client = await pool.connect();
  try {
    const offset = (page - 1) * limit;
    const query =
      "SELECT * FROM qr_bonus_flyer ORDER BY created_at DESC LIMIT $1 OFFSET $2";
    const result = await pool.query(query, [limit, offset]);
    // get all qr_bonus_flyer count
    const query1 = "SELECT COUNT(*) FROM qr_bonus_flyer";
    const result1 = await pool.query(query1);

    res.status(200).json({
      message: "All qr_bonus_flyer",
      total_qr_bonus_flyer: result1.rows[0].count,
      data: result.rows,
      error: false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: "Internal server error" });
  } finally {
    client.release();
  }
};
// get single qr_bonus_flyer
exports.getSingleqr_bonus_flyer = async (req, res) => {
  const { qr_bonus_flyer_id } = req.params;
  const client = await pool.connect();
  try {
    const query = "SELECT * FROM qr_bonus_flyer WHERE qr_bonus_flyer_id=$1";
    const result = await pool.query(query, [qr_bonus_flyer_id]);
    res.status(200).json({
      error: false,
      message: "Single qr_bonus_flyer",
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: "Internal server error" });
  } finally {
    client.release();
  }
};
exports.updateqr_bonus_flyer = async (req, res) => {
  const { id, bonus_name, start_date, end_date, bonus_coins, qr_image } =
    req.body;

  const fields = [];
  const values = [];
  let index = 1;

  if (bonus_name)
    fields.push(`bonus_name = $${index++}`), values.push(bonus_name);
  if (start_date)
    fields.push(`start_date = $${index++}`), values.push(start_date);
  if (end_date) fields.push(`end_date = $${index++}`), values.push(end_date);
  if (bonus_coins)
    fields.push(`bonus_coins = $${index++}`), values.push(bonus_coins);
  if (qr_image) fields.push(`qr_image = $${index++}`), values.push(qr_image);

  if (fields.length === 0) {
    return res
      .status(400)
      .json({ error: true, message: "No fields provided to update" });
  }

  const query = `
      UPDATE qr_bonus_flyer 
      SET ${fields.join(", ")}, updated_at = NOW() 
      WHERE qr_bonus_flyer_id = $${index} RETURNING *`;
  values.push(id);

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Record not found" });
    }
    res.json({ error: false, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message, error: true });
  }
};
// also create delete
exports.deleteqr_bonus_flyer = async (req, res) => {
  const { qr_bonus_flyer_id } = req.body;
  const client = await pool.connect();
  try {
    const query = "DELETE FROM qr_bonus_flyer WHERE qr_bonus_flyer_id=$1";
    const userData = await pool.query(query, [qr_bonus_flyer_id]);
    if (userData.rowCount === 0) {
      return res
        .status(404)
        .json({ error: true, message: "qr_bonus_flyer not found" });
    } else {
      return res
        .status(200)
        .json({ error: false, message: "qr_bonus_flyer deleted successfully" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: "Internal server error" });
  } finally {
    client.release();
  }
};
