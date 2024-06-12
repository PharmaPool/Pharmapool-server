const nodemailer = require("nodemailer");

const mailer = async (
  email,
  subject,
  message,
  username,
  link,
  btnText,
  link2
) => {
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
    html: `<div
      style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin-top: 1rem;
        width: 100vw;
        text-align: center;
        border: #004d40 1px solid;
        padding: 2rem;
        background-color: #ecfbfa;
      "
    >
      <img
        src="https://res.cloudinary.com/dex0mkckw/image/upload/v1715731041/c3957c0f04ee9096d7c0d6a7.png"
        alt="logo"
        width="70"
        height="70"
      />
      <h2>Account Verification</h2>
        <h3>${username},</h3>
        <p>
          ${message}
        </p>
        <button
          style="
            font-size: large;
            width: max-content;
            height: max-content;
            font-weight: bold;
            background-color: #004d40;
            border: none;
            padding: 0.5rem 1rem;
            cursor: pointer;
            border-radius: 0.2rem;
          "
        >
          <a
            href=${link}
            style="text-decoration: none; color: white"
            onclick="window.open(${link2})"
            >${btnText}</a
          >
        </button>
    </div>`,
  };

  await transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.log(error);
    else console.log("email sent successfully: " + info.response);
  });
};

module.exports = mailer;
