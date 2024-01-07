const nodemailer = require("nodemailer");

const nodemailer = (email, subject, message, username, link, btnText) => {
  const transporter = nodemailer.createTransport({
    host: "host",
    secure: true,
    port: 465,
    tls: {
      ciphers: "SSLv3",
    },
    auth: {
      user: "username",
      pass: "password",
    },
    from: "sender",
  });

  const mailOptions = {
    from: "<pharmapool@gmail.com>",
    to: email,
    subject: subject,
    html: `<h1>Dear ${username}</h1>
              <p>${message}</p>
              <button style="font-size: large; width: 30%; height: 3rem; font-weight: bold; background-color: blue;" ><a href="${link}" style="text-decoration: none; color: white;">${btnText}</a></button>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.log(error);
    else console.log("email sent successfully: " + info.response);
  });
};

module.exports = nodemailer;
