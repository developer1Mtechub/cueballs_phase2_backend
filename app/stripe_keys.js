// urls.js
// const SECRET_KEY='sk_test_51M4MJTG6E8HShDISYLSr0LfbrtYzYwEEgGZfTu3kWMNFRGurbOIaaDAgmk0he3cuC5LNVsqozqQqVKC0sYmitomN00IQwtaNS7'

// const PUBLISHABLE_KEY='pk_test_51M4MJTG6E8HShDISFyEI14H2x6tH8TH21B0sDWluCQ4Iv2ljQYn0gppIts9JO3FLiJfZzzwtVtu083g62siPwNuJ007grrrCos'
// const admin_email="testing.mtechub@gmail.com"
const SECRET_KEY = process.env.SECRET_KEY;
const PUBLISHABLE_KEY = process.env.PUBLISHABLE_KEY;
const admin_email = process.env.admin_email;
const secret_key_hash = process.env.secret_key_hash;
module.exports = { SECRET_KEY, PUBLISHABLE_KEY, admin_email, secret_key_hash };
