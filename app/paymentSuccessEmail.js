const nodemailer = require('nodemailer');
const imageURL = require('./EmailImage');
const { FacebookImageUrl, instagramLink, InstagramImageUrl, twitterLink, TwitterImageUrl, youtubeLink, youtubeImageUrl, facebookLink, contact_us_email, welcomeImagee, tickImage, linkedINLink, linkedINImageUrl } = require('./socialIcons');
const fetchSocialLinks = require('./utils/social_links');


const PaymentSuccess = async (
  email,
  subject,
  game_id,
  entry_fee,
  total_participants,
  jackpot, today_date) => {
  const socialLinks = await fetchSocialLinks();

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: "testing.mtechub@gmail.com",
      pass: "obzllcsiuvbrksnf",

    },
  });

  const mailOptions = {
    from: "cuballdash@gmail.com",
    to: email,
    subject: subject,
    html: `
    <!DOCTYPE html>
    <html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    
    <head>
      <meta charset="utf-8">
      <meta name="x-apple-disable-message-reformatting">
      <meta http-equiv="x-ua-compatible" content="ie=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
      <!--[if mso]>
        <xml><o:officedocumentsettings><o:pixelsperinch>96</o:pixelsperinch></o:officedocumentsettings></xml>
      <![endif]-->
      <title>Welcome to Cue Balls👋</title>
      <link
        href="https://fonts.googleapis.com/css?family=Rubik:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,200;1,300;1,400;1,500;1,600;1,700"
        rel="stylesheet" media="screen">
      <style>
        .hover-underline:hover {
          text-decoration: underline !important;
        }
    
        @media (max-width: 600px) {
          .sm-w-full {
            width: 100% !important;
          }
    
          .sm-px-24 {
            padding-left: 24px !important;
            padding-right: 24px !important;
          }
    
          .sm-py-32 {
            padding-top: 32px !important;
            padding-bottom: 32px !important;
          }
    
          .sm-leading-32 {
            line-height: 32px !important;
          }
        }
      </style>
    </head>
    
    <body
      style="margin: 0; width: 100%; padding: 0; word-break: break-word; -webkit-font-smoothing: antialiased; background-color: #eceff1;">
      <div style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; display: none;">We are please to
        Welcome to Cue Balls</div>
      <div role="article" aria-roledescription="email" aria-label="Welcome to TSM Academy 👋" lang="en"
        style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly;">
    
        <div style="display: block; text-align: center; margin-top:40px">
          <div
            style="mso-line-height-rule: exactly;
            display: inline-block;
            justify-content: center; border-radius: 4px; background-color: #ffffff; text-align: center; font-family: Rubik, -apple-system, 'Segoe UI', sans-serif; font-size: 16px; line-height: 24px; color: #626262;width: 600px;margin-block: 40px;">
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="text-align: left; width: 33.33%;">
                <a href="https://1.envato.market/vuexy_admin"
                style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly;">
                <img src=${imageURL} width="155" alt="Cue balls logo"
                  style="width:79px;height:62px;  line-height: 100%; border: 0;">
              </a></td>
              <td style="text-align: center; width: 33.33%;"></td>
              <td style="text-align: right; width: 33.33%;"> 
                <p
                style="color:#060502; display: flex;justify-content: center; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly;font-size: 15px;line-height: 17px; font-weight: 400;">
                ${today_date}</p></td>
            </tr>
          </table>
         
           
            
            <div style="padding: 20px;">
              <p
                style="color:rgba(245, 188, 1, 1); font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; font-size: 23px;line-height: 37px; font-weight: 400;">
                Payment Successful!</p>
    
              <p
                style="text-align: left; color: rgba(25, 25, 25, 1);font-size: 14px; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin: 0; margin-top: 10px; margin-bottom: 24px;">
                Great news! Your entry fee for the upcoming game has been submitted successfully. Get ready for an adrenaline-pumping experience as you step into the arena to showcase your skills. Here are the details of your payment:
    
              </p>
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: right; width: 40%; font-size: 14px; color: rgba(6, 5, 2, 0.7);font-weight:400; ">
                    Game ID
                  </td>
                  <td style="text-align: center; width: 20%;">
                  </td>
                  <td style="text-align: left; width: 40%; font-size: 14px;font-weight:500; color: rgba(245, 188, 1, 1);"># ${game_id}</td>
                </tr>
    
                <tr>
                  <td style="text-align: right; width: 40%; font-size: 14px; color: rgba(6, 5, 2, 0.7);font-weight:400;">
                   
                    Entry Fees
                 
                  </td>
                  <td style="text-align: center; width: 20%;">
                  </td>
                  <td style="text-align: left; width: 40%; font-size: 14px;font-weight:500; color: rgba(245, 188, 1, 1);">${entry_fee}</td>
                </tr>
    
                <tr>
                  <td style="text-align: right; width: 40%; font-size: 14px; color: rgba(6, 5, 2, 0.7);font-weight:400;">
                 
                    Total Participants
                  </td>
                  <td style="text-align: center; width: 20%;">
                  </td>
                  <td style="text-align: left; width: 40%; font-size: 14px;font-weight:500; color: rgba(245, 188, 1, 1);">${total_participants}</td>
                </tr>
                <tr>
                  <td style="text-align: right; width: 40%; font-size: 14px; color: rgba(6, 5, 2, 0.7);font-weight:400;">
                    Jackpot
                  </td>
                  <td style="text-align: center; width: 20%;">
                  </td>
                  <td style="text-align: left; width: 40%; font-size: 14px;font-weight:500; color: rgba(245, 188, 1, 1);">$ ${jackpot}</td>
                </tr>
              </table>
             
    
              <p
                style="color:rgba(25, 25, 25, 1); text-align: left; font-size: 14px; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin: 0; margin-top: 10px;">
                Your confirmation is the first step towards an exciting challenge, and we can't wait to see you in action. Prepare to make your mark and compete for glory!
    
              </p>
              <p
                style="color:rgba(25, 25, 25, 1);text-align: left; font-size: 14px; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin: 0; margin-top: 10px;">
                If you have any questions or concerns, feel free to reach out to our support team at 
                <span style="font-weight: 600;color: #F5BC01;">cueball-support@gmail.com</span> . Best of luck, and may victory be yours!
    
              </p>
              <p
                style="color:rgba(25, 25, 25, 1);font-size: 14px; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin: 0; margin-top: 10px;">
                Thanks.
    
              </p>
              <p
                style="font-size: 14px; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin: 0; margin-top: 10px;color: #F5BC01;font-weight: 600;">
                Cue-Ball-Team
    
              </p>
             
            </div>
            <div style="background-color: rgba(255, 236, 160, 1);padding: 20px;">
             
              <p
              style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin: 0; font-size: 13px;color:rgba(6, 5, 2, 0.7)">
              Now, go ahead, break the rack, and have a blast on the virtual felt!
            </p>
              <p
              style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin: 0; font-size: 13px;color:rgba(6, 5, 2, 0.7)">
              &copy; 2023 Cue Ball. All right reserved
            </p>
            
              <p align="center"
                style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin-bottom: 16px; cursor: default;">
                <a href=${socialLinks.instagram_url}
                style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; color: #263238; text-decoration: none;"><img
                  src=${socialLinks.instagram_image_url} width="17"
                  alt="Facebook"
                  style="max-width: 100%; vertical-align: middle; line-height: 100%; border: 0; margin-right: 12px;"></a>
    
              <a href=${socialLinks.facebook_url}
                style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; color: #263238; text-decoration: none;"><img
                  src=${socialLinks.facebook_image_url}  width="17"
                  alt="Twitter"
                  style="max-width: 100%; vertical-align: middle; line-height: 100%; border: 0; margin-right: 12px;"></a>
    
              <a href=${socialLinks.linkedin_url}
                style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; color: #263238; text-decoration: none;"><img
                  src=${socialLinks.linkedin_image_url} width="17"
                  alt="Instagram"
                  style="max-width: 100%; vertical-align: middle; line-height: 100%; border: 0; margin-right: 12px;"></a>
              <a href=${socialLinks.twitter_url}
                style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; color: #263238; text-decoration: none;"><img
                  src=${socialLinks.twitter_image_url} width="17"
                  alt="Instagram"
                  style="max-width: 100%; vertical-align: middle; line-height: 100%; border: 0; margin-right: 12px;"></a>
              </p>
    
            </div>
            <div style="background-color: rgba(245, 188, 1, 1);padding-block: 5px;">
              <p
                style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin: 0; font-size: 13px;color:rgba(255, 255, 255, 1)">
                &copy; 2023 Cue Ball. All right reserved
              </p>
            </div>
    
    
          </div>
        </div>
      </div>
    </body>
    
    </html>
        
        `,
  };

  // send email message
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(`Email sent: ${info.response}`);
    }
  });

}
module.exports = PaymentSuccess;