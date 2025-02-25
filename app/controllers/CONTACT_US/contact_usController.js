const { pool } = require("../../config/db.config");

exports.createMessages = async (req, res) => {
    const { first_name, last_name,email, message } = req.body;
    const client = await pool.connect();
    try {
        const userData = await pool.query("INSERT INTO contact_us(first_name,last_name,email,message) VALUES($1,$2,$3,$4) returning *",
            [
                first_name,
                last_name,
                email,
                message,
            ])
        res.status(200).json({ message: "Message sent successfully", data: userData.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}
// get all MessagescreateMessages 
exports.getAllMessagescreateMessages = async (req, res) => {
    const client = await pool.connect();
    try {
        const query = 'SELECT * FROM contact_us ORDER BY created_at DESC';
        const result = await pool.query(query);
        res.status(200).json({ message: "All messages get successfully", data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}
// get all MessagescreateMessages pagination 
exports.getAllMessagescreateMessagesPagination = async (req, res) => {
    const { page, limit } = req.query;
    const client = await pool.connect();
    try {
        const offset = (page - 1) * limit;
        const query = 'SELECT * FROM contact_us ORDER BY created_at DESC LIMIT $1 OFFSET $2';
        const result = await pool.query(query, [limit, offset]);
        // get all MessagescreateMessages count 
        const query1 = 'SELECT COUNT(*) FROM contact_us';
        const result1 = await pool.query(query1);

        res.status(200).json({
            message: "All messages get successfully",
            total_messages_count: result1.rows[0].count
            , data: result.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}
// get single MessagescreateMessages 
exports.getSingleMessagescreateMessages = async (req, res) => {
    const { message_id } = req.params;
    const client = await pool.connect();
    try {
        const query = 'SELECT * FROM contact_us WHERE message_id=$1';
        const result = await pool.query(query, [message_id]);
        res.status(200).json({ message: "Single message get successfully", data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}
// add ball images 
exports.addBallImages = async (req, res) => {
    const { image_url, name } = req.body;
    const client = await pool.connect();
    try {
        // Check if a row with the same name exists
        const checkQuery = 'SELECT * FROM balls_images WHERE name = $1';
        const checkResult = await client.query(checkQuery, [name]);

        if (checkResult.rows.length > 0) {
            // If a row with the same name exists, update it
            const updateQuery = 'UPDATE balls_images SET image_url = $1 WHERE name = $2 RETURNING *';
            const result = await client.query(updateQuery, [image_url, name]);
            res.status(200).json({ message: "Ball image updated successfully", data: result.rows[0] });
        } else {
            // If no row with the same name exists, insert a new row
            const insertQuery = 'INSERT INTO balls_images(image_url, name) VALUES($1, $2) RETURNING *';
            const result = await client.query(insertQuery, [image_url, name]);
            res.status(200).json({ message: "Ball image added successfully", data: result.rows[0] });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}
// get all ball images 
exports.getAllBallImages = async (req, res) => {

 const client = await pool.connect();
    try {
        const query = 'SELECT * FROM balls_images ORDER BY created_at ASC';
        const result = await pool.query(query);
        res.status(200).json({ message: "All messages get successfully", data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}


