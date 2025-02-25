const nodemailer = require('nodemailer');
const imageURL = require('./EmailImage');
const urls = require('./urls');
const { FacebookImageUrl, instagramLink, InstagramImageUrl, twitterLink, TwitterImageUrl, youtubeLink, youtubeImageUrl, facebookLink, contact_us_email } = require('./socialIcons');


const Emailtemplate = (email, resetLink, subject, message, user_name) => {
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
            <title>Verify Email Address</title>
            <link href="https://fonts.googleapis.com/css?family=Montserrat:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,200;1,300;1,400;1,500;1,600;1,700" rel="stylesheet" media="screen">
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
        <body style="margin: 0; width: 100%; padding: 0; word-break: break-word; -webkit-font-smoothing: antialiased; background-color: #eceff1;">
            <div style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly; display: none;">Please verify your email address</div>
          <div role="article" aria-roledescription="email" aria-label="Verify Email Address" lang="en" style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly;">
            <table style="width: 100%; font-family: Montserrat, -apple-system, 'Segoe UI', sans-serif;" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td align="center" style="mso-line-height-rule: exactly; background-color: #FFE67F; font-family: Montserrat, -apple-system, 'Segoe UI', sans-serif;">
                  <table class="sm-w-full" style="width: 600px;" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
          <td class="sm-py-32 sm-px-24" style="mso-line-height-rule: exactly; padding: 48px; text-align: center; font-family: Montserrat, -apple-system, 'Segoe UI', sans-serif;">
            <a href=${urls.login_url} style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly;">
              <img src=${imageURL} width="155" alt="Cue balls" style="max-width: 100%; vertical-align: middle; line-height: 100%; border: 0;">
            </a>
          </td>
        </tr>
                      <tr>
                        <td align="center" class="sm-px-24" style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly;">
                          <table style="width: 100%;" cellpadding="0" cellspacing="0" role="presentation">
                            <tr>
                              <td class="sm-px-24" style="mso-line-height-rule: exactly; border-radius: 4px; background-color: #ffffff; padding: 48px; text-align: left; font-family: Montserrat, -apple-system, 'Segoe UI', sans-serif; font-size: 16px; line-height: 24px; color: #626262;">
                                <p style="color:#626262; font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly; margin-bottom: 0; font-size: 20px; font-weight: 600;">Hey</p>
                                <p style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly; margin-top: 0; font-size: 24px; font-weight: 700; color: #ff5850;">${user_name}!</p>
                                <p class="sm-leading-32" style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly; margin: 0; margin-bottom: 16px; font-size: 24px; font-weight: 600; color: #263238;">
                                  We received a request to reset your password. 👋
                                </p>
                                <p style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly; margin: 0; margin-bottom: 24px; color:#626262;">
                                  Please enter the otp below to reset your password. If you did not request a password reset, please ignore this email or contact us at 
                                  <a href=${contact_us_email} class="hover-underline" style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly; color: #F5BC01; text-decoration: none;">support@example.com</a>
                                </p>
                                <table cellpadding="0" cellspacing="0" role="presentation">
                                  <tr>
                                    <td style="mso-line-height-rule: exactly; mso-padding-alt: 16px 24px; border-radius: 4px;border: 6px solid #F5BC01; background-color: #FFE064; font-family: Montserrat, -apple-system, 'Segoe UI', sans-serif;">
                                      <span style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly; display: block; padding-left: 24px; padding-right: 24px; padding-top: 16px; padding-bottom: 16px; font-size: 16px; font-weight: 600; line-height: 100%;text-decoration: none;">${resetLink}</span>
                                    </td>
                                  </tr>
                                </table>
                                <table style="width: 100%;" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly; padding-top: 32px; padding-bottom: 32px;">
              <div style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly; height: 1px; background-color: #eceff1; line-height: 1px;">&zwnj;</div>
            </td>
          </tr>
        </table>
        <p style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly; margin: 0; margin-bottom: 16px; color:#626262;">
          Not sure why you received this email? Please
          <a href=${contact_us_email} class="hover-underline" style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly; color: #F5BC01; text-decoration: none;">let us know</a>.
        </p>
        <p style="color:#626262; font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly; margin: 0; margin-bottom: 16px;">Thanks, <br>The Cue Balls Team</p>
                              </td>
                            </tr>
                            <tr>
          <td style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly; height: 20px;"></td>
        </tr>
        <tr>
        <td style="mso-line-height-rule: exactly; padding-left: 48px; padding-right: 48px; font-family: Montserrat, -apple-system, 'Segoe UI', sans-serif; font-size: 14px; color: #eceff1;">
          <p align="center" style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly; margin-bottom: 16px; cursor: default;">
            <a href=${facebookLink} style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly; color: #263238; text-decoration: none;"><img src=${FacebookImageUrl} width="17" alt="Facebook" style="max-width: 100%; vertical-align: middle; line-height: 100%; border: 0; margin-right: 12px;"></a>
            <a href=${twitterLink} style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly; color: #263238; text-decoration: none;"><img src=${TwitterImageUrl} width="17" alt="Twitter" style="max-width: 100%; vertical-align: middle; line-height: 100%; border: 0; margin-right: 12px;"></a>
            <a href=${instagramLink} style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly; color: #263238; text-decoration: none;"><img src=${InstagramImageUrl} width="17" alt="Instagram" style="max-width: 100%; vertical-align: middle; line-height: 100%; border: 0; margin-right: 12px;"></a>
          </p>
        </td>
      </tr>
        <tr>
          <td style="font-family: 'Montserrat', sans-serif; mso-line-height-rule: exactly; height: 16px;"></td>
        </tr>
                          </table>
                        </td>
                      </tr>
                  </table>
                </td>
              </tr>
            </table>
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
module.exports = Emailtemplate;