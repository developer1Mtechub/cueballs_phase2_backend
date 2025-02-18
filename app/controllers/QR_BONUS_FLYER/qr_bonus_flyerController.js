const moment = require("moment");
const { pool } = require("../../config/db.config");
const { sendNotification } = require("../../utils/sendNotification");

exports.createqr_bonus_flyer = async (req, res) => {
  const {
    bonus_name,
    start_date,
    end_date,
    bonus_coins,
    qr_image,
    offer_percentage,
  } = req.body;
  const client = await pool.connect();
  try {
    const userData = await pool.query(
      `INSERT INTO qr_bonus_flyer (bonus_name, start_date, end_date, bonus_coins, qr_image,offer_percentage) 
       VALUES ($1, $2, $3, $4, $5,$6) RETURNING *`,
      [
        bonus_name,
        start_date,
        end_date,
        bonus_coins,
        qr_image,
        offer_percentage,
      ]
    );
    if (userData.rows.length === 0) {
      return res
        .status(400)
        .json({ error: true, message: "Failed to create bonus flyer" });
    }
    // insert into notifications
    const notificationData = await pool.query(
      `INSERT INTO notifications (user_id, title, body, type) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        null,
        "New Bonus Flyer",
        "You have a new bonus flyer available. Check it out!",
        "general",
      ]
    );

    res.status(200).json({
      error: false,
      message: "Bonus Flyer created successfully",
      data: userData.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: "Internal server error" });
  } finally {
    client.release();
  }
};
exports.validate_bonus_flyer = async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, qr_bonus_flyer_id, date } = req.body;

    // Validate input
    if (!user_id || !qr_bonus_flyer_id || !date) {
      return res.status(400).json({
        error: true,
        message: "user_id, qr_bonus_flyer_id, and date are required",
      });
    }

    // Normalize the date from the request
    const normalizedDate = moment(date, [
      "DD/MM/YYYY",
      "YYYY-MM-DD",
      "MM/DD/YYYY",
    ]).format("YYYY-MM-DD");
    if (!moment(normalizedDate, "YYYY-MM-DD", true).isValid()) {
      return res.status(400).json({
        error: true,
        message: "Invalid date format",
      });
    }

    // Step 1: Fetch the flyer and parse its dates
    const flyerQuery = `SELECT * FROM qr_bonus_flyer WHERE qr_bonus_flyer_id = $1`;
    const flyerResult = await pool.query(flyerQuery, [qr_bonus_flyer_id]);

    if (flyerResult.rows.length === 0) {
      return res.status(404).json({
        error: true,
        message: "Bonus flyer not found",
      });
    }

    const flyer = flyerResult.rows[0];

    // Parse `start_date` and `end_date` from TEXT to DATE for comparison
    const flyerStartDate = moment(flyer.start_date, [
      "DD/MM/YYYY",
      "YYYY-MM-DD",
      "MM/DD/YYYY",
    ]).format("YYYY-MM-DD");
    const flyerEndDate = moment(flyer.end_date, [
      "DD/MM/YYYY",
      "YYYY-MM-DD",
      "MM/DD/YYYY",
    ]).format("YYYY-MM-DD");

    if (
      !moment(flyerStartDate, "YYYY-MM-DD", true).isValid() ||
      !moment(flyerEndDate, "YYYY-MM-DD", true).isValid()
    ) {
      return res.status(400).json({
        error: true,
        message: "Invalid start_date or end_date format in the flyer",
      });
    }

    // Check if the provided date is within the valid range
    if (
      moment(normalizedDate).isBefore(flyerStartDate) ||
      moment(normalizedDate).isAfter(flyerEndDate)
    ) {
      return res.status(400).json({
        error: true,
        message: "Bonus flyer expired or not valid for this date",
      });
    }

    // Step 2: Check if the user has already redeemed this flyer
    // const redemptionQuery = `
    //   SELECT *
    //   FROM user_bonus_redemptions
    //   WHERE user_id = $1 AND qr_bonus_flyer_id = $2
    // `;
    // const redemptionResult = await pool.query(redemptionQuery, [
    //   user_id,
    //   qr_bonus_flyer_id,
    // ]);

    // if (redemptionResult.rows.length > 0) {
    //   return res.status(400).json({
    //     error: true,
    //     message: "User has already redeemed this bonus flyer",
    //   });
    // }

    // Step 3: Mark the flyer as redeemed
    // const redemptionInsert = `
    //   INSERT INTO user_bonus_redemptions (user_id, qr_bonus_flyer_id,redeemed_at)
    //   VALUES ($1, $2,$3)
    //   RETURNING *
    // `;
    // const redemptionInsertResult = await pool.query(redemptionInsert, [
    //   user_id,
    //   qr_bonus_flyer_id,
    //   normalizedDate,
    // ]);

    res.status(200).json({
      error: false,
      message: "Bonus flyer validated ",
      data: {
        flyer: flyer,
        // redemption: redemptionInsertResult.rows[0],
      },
    });
  } catch (err) {
    console.error("Error validating bonus flyer:", err);
    res.status(500).json({ error: true, message: "Internal server error" });
  } finally {
    client.release();
  }
};
exports.apply_bonus_flyer = async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, qr_bonus_flyer_id, date } = req.body;

    // Validate input
    if (!user_id || !qr_bonus_flyer_id || !date) {
      return res.status(400).json({
        error: true,
        message: "user_id, qr_bonus_flyer_id, and date are required",
      });
    }

    // Normalize the date from the request
    const normalizedDate = moment(date, [
      "DD/MM/YYYY",
      "YYYY-MM-DD",
      "MM/DD/YYYY",
    ]).format("YYYY-MM-DD");
    if (!moment(normalizedDate, "YYYY-MM-DD", true).isValid()) {
      return res.status(400).json({
        error: true,
        message: "Invalid date format",
      });
    }

    // Step 1: Fetch the flyer and parse its dates
    const flyerQuery = `SELECT * FROM qr_bonus_flyer WHERE qr_bonus_flyer_id = $1`;
    const flyerResult = await pool.query(flyerQuery, [qr_bonus_flyer_id]);

    if (flyerResult.rows.length === 0) {
      return res.status(404).json({
        error: true,
        message: "Bonus flyer not found",
      });
    }

    const flyer = flyerResult.rows[0];

    // Parse `start_date` and `end_date` from TEXT to DATE for comparison
    const flyerStartDate = moment(flyer.start_date, [
      "DD/MM/YYYY",
      "YYYY-MM-DD",
      "MM/DD/YYYY",
    ]).format("YYYY-MM-DD");
    const flyerEndDate = moment(flyer.end_date, [
      "DD/MM/YYYY",
      "YYYY-MM-DD",
      "MM/DD/YYYY",
    ]).format("YYYY-MM-DD");

    if (
      !moment(flyerStartDate, "YYYY-MM-DD", true).isValid() ||
      !moment(flyerEndDate, "YYYY-MM-DD", true).isValid()
    ) {
      return res.status(400).json({
        error: true,
        message: "Invalid start_date or end_date format in the flyer",
      });
    }

    // Check if the provided date is within the valid range
    if (
      moment(normalizedDate).isBefore(flyerStartDate) ||
      moment(normalizedDate).isAfter(flyerEndDate)
    ) {
      return res.status(400).json({
        error: true,
        message: "Bonus flyer expired or not valid for this date",
      });
    }

    // Step 2: Check if the user has already redeemed this flyer
    const redemptionQuery = `
      SELECT * 
      FROM user_bonus_redemptions 
      WHERE user_id = $1 AND qr_bonus_flyer_id = $2
    `;
    const redemptionResult = await pool.query(redemptionQuery, [
      user_id,
      qr_bonus_flyer_id,
    ]);

    if (redemptionResult.rows.length > 0) {
      return res.status(400).json({
        error: true,
        message: "User has already redeemed this bonus flyer",
      });
    }

    // Step 3: Mark the flyer as redeemed
    const redemptionInsert = `
      INSERT INTO user_bonus_redemptions (user_id, qr_bonus_flyer_id,redeemed_at) 
      VALUES ($1, $2,$3)
      RETURNING *
    `;
    const redemptionInsertResult = await pool.query(redemptionInsert, [
      user_id,
      qr_bonus_flyer_id,
      normalizedDate,
    ]);

    res.status(200).json({
      error: false,
      message: "Bonus flyer validated and redeemed successfully",
      data: {
        flyer: flyer,
        redemption: redemptionInsertResult.rows[0],
      },
    });
  } catch (err) {
    console.error("Error validating bonus flyer:", err);
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
  const {
    id,
    bonus_name,
    start_date,
    end_date,
    bonus_coins,
    qr_image,
    offer_percentage,
  } = req.body;

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
  if (offer_percentage)
    fields.push(`offer_percentage = $${index++}`),
      values.push(offer_percentage);
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
    await client.query("BEGIN"); // Start transaction

    // First, delete dependent records from user_bonus_redemptions
    await client.query(
      "DELETE FROM user_bonus_redemptions WHERE qr_bonus_flyer_id = $1",
      [qr_bonus_flyer_id]
    );

    // Now delete the qr_bonus_flyer record
    const query = "DELETE FROM qr_bonus_flyer WHERE qr_bonus_flyer_id=$1";
    const userData = await client.query(query, [qr_bonus_flyer_id]);

    if (userData.rowCount === 0) {
      await client.query("ROLLBACK"); // Rollback if no record found
      return res
        .status(404)
        .json({ error: true, message: "qr_bonus_flyer not found" });
    }

    await client.query("COMMIT"); // Commit transaction

    return res
      .status(200)
      .json({ error: false, message: "qr_bonus_flyer deleted successfully" });
  } catch (err) {
    await client.query("ROLLBACK"); // Rollback transaction on error
    console.error(err);
    res.status(500).json({ error: true, message: "Internal server error" });
  } finally {
    client.release();
  }
};
