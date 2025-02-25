const nodemailer = require('nodemailer');
const imageURL = require('./EmailImage');
const fetchSocialLinks = require('./utils/social_links');
const { verification_email_image } = require('./socialIcons');

const VerificationEmail = async (email, subject, otp) => {
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
            text-align: center;  border-radius: 4px; background-color: #ffffff;  font-family: Rubik, -apple-system, 'Segoe UI', sans-serif; font-size: 16px; line-height: 24px; color: #626262;width: 600px;margin-top: 40px;margin-bottom:40px">
            <a href="https://1.envato.market/vuexy_admin"
              style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly;">
              <img src=${imageURL} width="155" alt="Cue balls logo"
                style="width:79px;height:62px;margin-top:20px;  line-height: 100%; border: 0;"/>
            </a>
            <div style="background-color: #F5BC01;padding: 20px;">
    
              <img src=${verification_email_image}
                width="155" alt="Cue balls logo" style="width:242px;height:30px;  line-height: 100%; border: 0;">
              <p
                style="color:rgba(255, 255, 255, 1); text-align: center; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin-block: 30px; font-size: 28px;line-height: 38px; font-weight: 600;">
                Email Verification</p>
            </div>
            <div style="padding: 20px;">
              <p
                style="color:#060502; text-align: center; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin-block: 30px; font-size: 24px;line-height: 37px; font-weight: 400;">
                Hi,</p>
    
              <p
                style="color: rgba(25, 25, 25, 1);font-size: 14px; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin: 0; margin-top: 10px; margin-bottom: 24px;">
                Welcome to the Cue-Ball, your gateway to exciting matches and thrilling victories!
                To get you started, we just need to verify your email address. Here's your unique verification code:
    
              </p>
              <div style="text-align: center;margin-left:33%">
                <p
                  style="display: block; background-color: rgba(255, 236, 160, 1);border: 5px solid rgba(245, 188, 1, 1);border-radius: 20px; color: rgba(25, 25, 25, 1);font-size: 24px; font-family: 'Rubik', sans-serif; margin: 0; padding: 10px; margin-bottom: 14px;width: 50%;height:46px">
                  ${otp}
                </p>
              </div>
    
              <p
                style=" color:rgba(25, 25, 25, 1); font-size: 14px; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin: 0; margin-top: 10px;">
                If you didn't initiate this request or have any concerns, please contact our support team at
                <span style="font-weight: 600;color: #F5BC01;">cueball-support@gmail.com.</span>
    
              </p>
              <p
                style="color:rgba(25, 25, 25, 1);font-size: 14px; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin: 0; margin-top: 10px;">
                Thank you for choosing Cue-Ball. We look forward to providing you with a seamless and secure experience.
    
              </p>
              <p
                style="color:rgba(25, 25, 25, 1); font-size: 14px; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin: 0; margin-top: 10px;">
                Thanks.
    
              </p>
              <p
                style="font-size: 14px; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin: 0; margin-top: 10px;color: #F5BC01;font-weight: 600;">
                Cue-Ball-Team
    
              </p>
            </div>
            <div style="background-color: rgba(255, 236, 160, 1);padding:10px">
    
              <p style="color:rgba(25, 25, 25, 1); font-size: 17px; font-family: 'Rubik', sans-serif;font-weight: 600;">
                Get in Touch!
    
    
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
module.exports = VerificationEmail;