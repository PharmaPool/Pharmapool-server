const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const mailer = async (email, subject, message, username, code) => {
  const mail = process.env.EMAIL;
  const pass = process.env.PASS;

  const transporter = await nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true,
    auth: {
      user: mail,
      pass: pass,
    },
  });

  const mailOptions = {
    from: "Pharmapool <info@pharmapoolng.com>",
    to: email,
    subject: subject,
    html: `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8"> <!-- utf-8 works for most cases -->
    <meta name="viewport" content="width=device-width"> <!-- Forcing initial-scale shouldn't be necessary -->
    <meta http-equiv="X-UA-Compatible" content="IE=edge"> <!-- Use the latest (edge) version of IE rendering engine -->
    <meta name="x-apple-disable-message-reformatting">  <!-- Disable auto-scale in iOS 10 Mail entirely -->
    <title></title> <!-- The title tag shows in email notifications, like Android 4.4. -->

    <link href="https://fonts.googleapis.com/css?family=Lato:300,400,700" rel="stylesheet">
</head>

<body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: #f1f1f1;">
	<center style="width: 100%; background-color: #f1f1f1;">
    <div style="display: none; font-size: 1px;max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
      &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
    </div>
    <div style="max-width: 600px; margin: 0px auto;" class="email-container">
    	<!-- BEGIN BODY -->
      <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: auto; background-color: white;">
      	<tr>
          <td valign="top" class="bg_white" style="padding: 1em 2.5em 0 2.5em;">
          	<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          		<tr>
          			<td class="logo" style="text-align: center;">
			            <img src="https://res.cloudinary.com/dex0mkckw/image/upload/v1715731041/c3957c0f04ee9096d7c0d6a7.png" alt="" style="width: 100px; max-width: 100px; height: auto; margin: auto; display: block;">
			          </td>
          		</tr>
          	</table>
          </td>
	      </tr><!-- end tr -->
	      <tr>
          <!-- <td valign="middle" class="hero bg_white" style="padding: 3em 0 2em 0;">
           
          </td> -->
	      </tr><!-- end tr -->
				<tr>
          <td valign="middle" class="hero bg_white" style="padding: 2em 0 4em 0; display: flex; align-items: center; justify-content: center;">
            <table>
            	<tr>
            		<td>
            			<div class="text" style="padding: 0 2.5em; text-align: center;">
						<h1 style="margin-top: 0px; text-align: center; color: black;">${subject}</h1>
						<div style="padding: 1em 0 1em 0;"></div>
						<h3 style="font-weight: bold; color: black;">Dear ${username},</h3>
						<h3 style="color: black;">${message}</h3>
              <h2 style="background-color: #004d40; color: #fff; border: none; padding: 1rem; font-size: x-large; font-weight: bolder;">${code}</h2>
            			</div>
            		</td>
            	</tr>
            </table>
          </td>
	      </tr><!-- end tr -->
      <!-- 1 Column Text + Button : END -->
      </table>
      <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: auto;">
      	<tr>
          <td valign="middle" class="bg_light footer email-section" style="background-color: #e0f2f1; padding-bottom: 1rem; color: black;">
            <table>
            	<tr>
                <td valign="top" width="70%" style="padding-top: 20px; padding-left: 0rem;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="text-align: left; padding-left: 1rem; padding-right: 1rem; list-style-type: none">
                      	<h3 class="heading">Contact Info</h3>
							<p style="margin-bottom: 1rem; font-size: large; list-style-type: none;"><span class="text">47 Ozomadu Close, St. Theresa's Road, Nsukka, Enugu State, Nigeria.</span></p>
							<p style="margin-bottom: 1rem; font-size: large; font-weight: bold; list-style-type: none;"><span class="text">+234 813 8413 948</span></a></li>
                      </td>
                    </tr>
                  </table>
                </td>
                <td valign="top" width="30%" style="padding-top: 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="text-align: center; padding-left: 10px; list-style-type: none; ">
                      	<h3 class="heading">Useful Links</h3>
							<p style="margin-bottom: 0rem; list-style-type: none;"><a href="http://localhost:3000/" style="text-decoration: none; color: black;">Home</a></p>
							<p style="margin-bottom: 0rem; list-style-type: none;"><a href="http://localhost:3000/about" style="text-decoration: none; color: black;">About</a></p>
							<p style="margin-bottom: 0rem; list-style-type: none;"><a href="http://localhost:3000/business" style="text-decoration: none; color: black;">Business</a></p>
							<p style="margin-bottom: 0rem; list-style-type: none;"><a href="http://localhost:3000/contact" style="text-decoration: none; color: black;">Contact us</a></p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr><!-- end: tr -->
        <tr>
          <td class="bg_light" style="text-align: center; background-color: black; color: white;">
          	<p>© 2024 Pharmapool | All Rights Reserved</p>
          </td>
        </tr>
      </table>

    </div>
  </center>
</body>
</html>
`,
  };

  await transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.log(error);
    else console.log("email sent successfully: " + info.response);
  });
};

module.exports = mailer;
