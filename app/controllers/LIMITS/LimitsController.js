const moment = require("moment");
const { pool } = require("../../config/db.config");
const { sendNotification } = require("../../utils/sendNotification");

exports.createOrUpdateLimit = async (req, res) => {
  const { deposit_limit, withdrawl_limit } = req.body;
  const client = await pool.connect();

  try {
    // Step 1: Check if a record already exists
    const existingLimit = await pool.query("SELECT * FROM limits LIMIT 1");

    if (existingLimit.rows.length > 0) {
      // Step 2: If a record exists, update it
      const updatedLimit = await pool.query(
        `UPDATE limits 
         SET deposit_limit = $1, withdrawl_limit = $2, updated_at = NOW() 
         WHERE limits_id = $3 RETURNING *`,
        [deposit_limit, withdrawl_limit, existingLimit.rows[0].limits_id]
      );

      return res.status(200).json({
        error: false,
        message: "Limit updated successfully",
        data: updatedLimit.rows[0],
      });
    } else {
      // Step 3: If no record exists, insert a new one
      const newLimit = await pool.query(
        `INSERT INTO limits (deposit_limit, withdrawl_limit) 
         VALUES ($1, $2) RETURNING *`,
        [deposit_limit, withdrawl_limit]
      );

      return res.status(200).json({
        error: false,
        message: "Limit created successfully",
        data: newLimit.rows[0],
      });
    }
  } catch (err) {
    console.error("Error in createOrUpdateLimit:", err);
    res.status(500).json({ error: true, message: "Internal server error" });
  } finally {
    client.release();
  }
};
exports.getLimit = async (req, res) => {
  const client = await pool.connect();

  try {
    // Fetch the limit (since we only allow one record, use LIMIT 1)
    const limitData = await pool.query("SELECT * FROM limits LIMIT 1");

    if (limitData.rows.length === 0) {
      return res.status(404).json({
        error: true,
        message: "No limit found",
      });
    }

    res.status(200).json({
      error: false,
      message: "Limit retrieved successfully",
      data: limitData.rows[0],
    });
  } catch (err) {
    console.error("Error in getLimit:", err);
    res.status(500).json({ error: true, message: "Internal server error" });
  } finally {
    client.release();
  }
};
