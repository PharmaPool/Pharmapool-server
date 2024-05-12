const nodemailer = require("nodemailer");

const mailer = async (email, subject, message, username, link, btnText) => {
  const transporter = await nodemailer.createTransport({
    host: "smtpout.secureserver.net",
    secure: true,
    secureConnection: false, // TLS requires secureConnection to be false
    tls: {
      ciphers: "SSLv3",
    },
    requireTLS: true,
    port: 465,
    debug: true,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASS,
    },
  });

  const mailOptions = {
    from: "<info@pharmapoolng.com>",
    to: email,
    subject: subject,
    html: `<h1>Dear ${username}</h1>
              <p>${message}</p>
              <button style="font-size: large; width: 30%; height: 3rem; font-weight: bold; background-color: blue;" ><a href="${link}" style="text-decoration: none; color: white;">${btnText}</a></button>`,
  };

  await transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.log(error);
    else console.log("email sent successfully: " + info.response);
  });
};

module.exports = mailer;
