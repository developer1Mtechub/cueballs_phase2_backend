const { pool } = require("../../config/db.config");

exports.create_update_policy = async (req, res) => {
    const { content } = req.body;
    const client = await pool.connect();
    try {
        const result = await client.query(`
        INSERT INTO privacy_policy (privacy_policy_id, content, updated_at)
        VALUES (1, $1, NOW())
        ON CONFLICT (privacy_policy_id) 
        DO UPDATE SET content = $1, updated_at = NOW()
      `, [content]);
  
      res.json({ status: 'success', message: 'Policy Updated Successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}
// get privacy policy 
exports.getPrivacyPolicy = async (req, res) => {
    const client = await pool.connect();
    try {
        const query = 'SELECT * FROM privacy_policy ORDER BY updated_at DESC LIMIT 1';
        const result=await pool.query(query);
        res.status(200).json({ message: "Privacy policy get successfully", data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }finally {
        client.release();
    }
}
// terms 
exports.create_update_terms = async (req, res) => {
    const { content } = req.body;
    const client = await pool.connect();
    try {
        const result = await client.query(`
        INSERT INTO terms_and_conditions (terms_and_conditions_id, content, updated_at)
        VALUES (1, $1, NOW())
        ON CONFLICT (terms_and_conditions_id) 
        DO UPDATE SET content = $1, updated_at = NOW()
      `, [content]);
  
      res.json({ status: 'success', message: 'Terms Updated Successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}

// get privacy policy 
exports.getTerms = async (req, res) => {
    const client = await pool.connect();
    try {
        const query = 'SELECT * FROM terms_and_conditions ORDER BY updated_at DESC LIMIT 1';
        const result=await pool.query(query);
        res.status(200).json({ message: "Terms get successfully", data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }finally {
        client.release();
    }
}
// create_update_social_links
exports.create_update_social_links = async (req, res) => {
    const { facebook_url, facebook_image_url, instagram_image_url, instagram_url, twitter_url, twitter_image_url, linkedin_url, linkedin_image_url } = req.body;
    const client = await pool.connect();
 
    try {
        const result = await client.query(`
        INSERT INTO social_links (social_links_id, facebook_url, facebook_image_url, instagram_image_url, instagram_url, twitter_url, twitter_image_url, linkedin_url, linkedin_image_url, updated_at)
        VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (social_links_id) 
        DO UPDATE SET facebook_url = $1, facebook_image_url = $2, instagram_image_url = $3, instagram_url = $4, twitter_url = $5, twitter_image_url = $6, linkedin_url = $7, linkedin_image_url = $8, updated_at = NOW()
      `, [facebook_url, facebook_image_url, instagram_image_url, instagram_url, twitter_url, twitter_image_url, linkedin_url, linkedin_image_url]);
  
      res.json({ status: 'success', message: 'Social Links Updated Successfully' });
  
    }catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}
// get social links 
exports.getSocialLinks = async (req, res) => {
    const client = await pool.connect();
    try {
        const query = 'SELECT * FROM social_links ORDER BY updated_at DESC LIMIT 1';
        const result=await pool.query(query);
        res.status(200).json({ message: "Social links get successfully", data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }finally {
        client.release();
    }
}
// create update support_email 
exports.create_update_support_email = async (req, res) => {
    const { email,phone_no,address } = req.body;
    const client = await pool.connect();

    try {
        const result = await client.query(`
        INSERT INTO support_email (support_email_id, email,phone_no,address, updated_at)
        VALUES (1, $1,$2,$3, NOW())
        ON CONFLICT (support_email_id) 
        DO UPDATE SET email = $1,phone_no=$2,address=$3, updated_at = NOW()
      `, [email,phone_no,address]);
  
      res.json({ status: 'success', message: 'Support Email Updated Successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}
// get support_email 
exports.getSupportEmail = async (req, res) => {
    const client = await pool.connect();
    try {
        const query = 'SELECT * FROM support_email ORDER BY updated_at DESC LIMIT 1';
        const result=await pool.query(query);
        res.status(200).json({ message: "Support Email get successfully", data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }finally {
        client.release();
    }
}
// create update download buttons
exports.create_update_download_buttons = async (req, res) => {
    const { play_store_url,
        app_store_url,
        download_now_url } = req.body;
    const client = await pool.connect();

    try {
        const result = await client.query(`
        INSERT INTO website_download (website_download_id, play_store_url,app_store_url,download_now_url, updated_at)
        VALUES (1, $1,$2,$3, NOW())
        ON CONFLICT (website_download_id) 
        DO UPDATE SET play_store_url = $1,app_store_url=$2,download_now_url=$3, updated_at = NOW()
      `, [play_store_url,app_store_url,download_now_url]);
  
      res.json({ status: 'success', message: 'Download Buttons Updated Successfully' });
       
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}
// get urls 
exports.getDownloadButtons = async (req, res) => {
    const client = await pool.connect();
    try {
        const query = 'SELECT * FROM website_download ORDER BY updated_at DESC LIMIT 1';
        const result=await pool.query(query);
        res.status(200).json({ message: "Download Buttons get successfully", data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }finally {
        client.release();
    }
}
