const { pool } = require("../../config/db.config");
const { sendNotification } = require("../../utils/sendNotification");

exports.createFeedback = async (req, res) => {
  const { name, email, message } = req.body;
  const client = await pool.connect();
  try {
    const userData = await pool.query(
      "INSERT INTO feedback(name,email,message) VALUES($1,$2,$3) returning *",
      [name, email, message]
    );
    // Step 4: Retrieve all admin users
    const adminUsers = await client.query(
      "SELECT user_id, email, device_token, web_token FROM users WHERE role = $1",
      ["admin"]
    );

    // Step 5: Send notifications to all admins
    const title = "New Feedback Received";
    const body = `New feedback received from ${name} is: ${message}`;

    const type = "withdraw_desposit";

    for (const admin of adminUsers.rows) {
      const data = {
        userId: admin.user_id,
        data: userData.rows[0],
      };
      const token = {
        deviceToken: admin.device_token,
        webToken: admin.web_token,
      };
      await sendNotification(token, title, body, data, type);
    }

    res
      .status(200)
      .json({ message: "Message sent successfully", data: userData.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};
// get all feedback
exports.getAllFeedback = async (req, res) => {
  const client = await pool.connect();
  try {
    const query = "SELECT * FROM feedback ORDER BY created_at DESC";
    const result = await pool.query(query);
    res.status(200).json({ message: "All feedback", data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};
// get all feedback pagination
exports.getAllFeedbackPagination = async (req, res) => {
  const { page, limit } = req.query;
  const client = await pool.connect();
  try {
    const offset = (page - 1) * limit;
    const query =
      "SELECT * FROM feedback ORDER BY created_at DESC LIMIT $1 OFFSET $2";
    const result = await pool.query(query, [limit, offset]);
    // get all feedback count
    const query1 = "SELECT COUNT(*) FROM feedback";
    const result1 = await pool.query(query1);

    res.status(200).json({
      message: "All feedback",
      total_feedback: result1.rows[0].count,
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};
// get single feedback
exports.getSingleFeedback = async (req, res) => {
  const { feedback_id } = req.params;
  const client = await pool.connect();
  try {
    const query = "SELECT * FROM feedback WHERE feedback_id=$1";
    const result = await pool.query(query, [feedback_id]);
    res.status(200).json({ message: "Single feedback", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};
// get all active users count whose deleted status false
exports.getActiveUsersCount = async (req, res) => {
  const client = await pool.connect();
  try {
    const queryU = "SELECT COUNT(*) FROM users WHERE deleted_user = $1 ";
    const resultU = await pool.query(queryU, [false]);

    const query =
      "SELECT COUNT(*) FROM users WHERE deleted_user = $1 AND account_status = $2";
    const result = await pool.query(query, [false, "active"]);
    // get all games count
    const query1 = "SELECT COUNT(*) FROM games";
    const result1 = await pool.query(query1);
    // get all deleted users count
    const query2 = "SELECT COUNT(*) FROM users WHERE deleted_user = $1";
    const result2 = await pool.query(query2, [true]);
    console.log(result2.rows.length);
    res.status(200).json({
      message: "Data get Successfully",
      total_active_users: result.rows[0].count,
      total_downloads: resultU.rows[0].count,
      total_games: result1.rows[0].count,
      deleted_users: result2.rows[0].count,
    });
    // res.status(200).json({ message: "Total active users", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};
// get single user played games and win games by user id and wallet from wallet table
exports.getSingleUserPlayedGamesAndWinGamesByUserId = async (req, res) => {
  const { user_id } = req.query;
  const client = await pool.connect();
  try {
    const query =
      "SELECT * FROM game_users WHERE user_id=$1 AND winning_ball IS NOT NULL";
    const result = await pool.query(query, [user_id]);
    // get wallet details
    const query1 = "SELECT * FROM wallet WHERE user_id=$1 AND type=$2";
    const result1 = await pool.query(query1, [user_id, "withdrawl"]);
    const query2 = "SELECT * FROM wallet WHERE user_id=$1 AND type=$2";
    const result2 = await pool.query(query2, [user_id, "bonus"]);

    result1.rows[0].balance =
      Number(result1.rows[0].balance || 0) % 1 === 0
        ? Number(result1.rows[0].balance || 0)
        : Number(result1.rows[0].balance || 0).toFixed(2);

    res.status(200).json({
      message: "Data get Successfully",
      data: {
        played_games: result.rows,
        played_games_count: result.rows.length,
        withdrawl_balance:
          Number(result1.rows[0].balance || 0) % 1 === 0
            ? Number(result1.rows[0].balance || 0)
            : Number(result1.rows[0].balance || 0).toFixed(2),
        bonus_balance:
          Number(result2.rows[0].balance || 0) % 1 === 0
            ? Number(result2.rows[0].balance || 0)
            : Number(result2.rows[0].balance || 0).toFixed(2),

        withdrawl_wallet: result1.rows[0],
        bonus_wallet: result2.rows[0],

        // wallet_balance:result1.rows[0].balance
      },
    });
    // res.status(200).json({ message: "Total active users", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};
// create app_share_link
exports.createAppShareLink = async (req, res) => {
  const { url } = req.body;
  const client = await pool.connect();
  try {
    // check if it exist then not insert another just update the previous
    const queryCheck = "SELECT * FROM app_share_link";
    const resultCheck = await pool.query(queryCheck);
    if (resultCheck.rows.length > 0) {
      // update
      const queryUpdate =
        "UPDATE app_share_link SET url=$1 WHERE link_id=$2 returning *";
      const resultUpdate = await pool.query(queryUpdate, [
        url,
        resultCheck.rows[0].link_id,
      ]);
      res.status(200).json({
        message: "App share link updated successfully",
        data: resultUpdate.rows[0],
      });
      return;
    } else {
      const query = "INSERT INTO app_share_link(url) VALUES($1) returning *";
      const result = await pool.query(query, [url]);
      res.status(200).json({
        message: "App share link created successfully",
        data: result.rows[0],
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};
// get app_share_link by id
exports.getAppShareLink = async (req, res) => {
  const client = await pool.connect();
  try {
    const query = "SELECT * FROM app_share_link ";
    const result = await pool.query(query);

    res
      .status(200)
      .json({ message: "Data get Successfully", result: result.rows[0] });
    // res.status(200).json({ message: "Total active users", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};
function formatNumber(number) {
  return Number(number) % 1 === 0 ? Number(number) : Number(number).toFixed(2);
}
// get all completed games commision winning amount summ
exports.getCompletedGamesCommisionWinningAmountSum = async (req, res) => {
  const client = await pool.connect();
  try {
    const query = `
        SELECT 
            SUM(winning_amount::numeric) AS winning_amount_sum, 
            SUM(commision_winning_amount::numeric) AS commission_sum 
        FROM games 
        WHERE game_status=$1
    `;

    const result = await pool.query(query, ["completed"]);
    const formattedData = {
      winning_amount_sum: formatNumber(result.rows[0].winning_amount_sum),
      commission_sum: formatNumber(result.rows[0].commission_sum),
    };
    res
      .status(200)
      .json({ message: "Data get Successfully", data: formattedData });
    // res.status(200).json({ message: "Data get Successfully", data: result.rows[0] });

    // res.status(200).json({ message: "Total active users", data: formattedData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};
