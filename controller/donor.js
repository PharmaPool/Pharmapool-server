const Wallet = require("../model/wallet");
const Donor = require("../model/donor");
const dotenv = require("dotenv");
dotenv.config();

const Paystack = require("paystack")(process.env.PAYSTACK_KEY);
const error = require("../util/error-handling/errorHandler");
const https = require("https");

// create chat wallet
module.exports.createDonor = async (req, res, next) => {
  const name = req.body.name,
    email = req.body.email,
    phone = req.body.phone,
    amount = Number(req.body.amount);

  try {
    // register donor
    const donor = await new Donor({ name, email, phone, amount });
    await donor.save();

    // create subaccount
    const business_name = `${name} donation`;
    const subaccount = await Paystack.subaccount.create({
      business_name,
      settlement_bank: process.env.SETTLEMENT_BANK,
      account_number: process.env.ACCOUNT_NUMBER,
      percentage_charge: process.env.PERCENTAGE_CHARGE,
    });

    // create wallet
    const wallet = new Wallet({
      walletAddress: subaccount.data.subaccount_code,
      walletId: subaccount.data.id,
      amount,
    });
    wallet.supplier.user = donor._id;
    await wallet.save();

    // send response to client
    res.status(200).json({
      success: true,
      message: "wallet created successfully",
      wallet,
    });
  } catch (err) {
    error.error(err, next);
  }
};

// accept wallet payment
module.exports.acceptDonation = async (req, res, next) => {
  const amount = Math.round(Number(req.body.amount)) * 100,
    subaccount = req.params.walletAddress,
    email = req.body.email;
  let data = "",
    result;

  try {
    // get and validate wallet
    const wallet = await Wallet.findOne({ walletAddress: subaccount }).populate(
      {
        path: "referenceCodes",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      }
    );
    if (!wallet) {
      error.errorHandler(res, "wallet not found", "wallet");
      return;
    }

    const params = JSON.stringify({
      email,
      amount,
      subaccount,
      transaction_charge: 0,
    });

    const options = {
      hostname: "api.paystack.co",
      port: 443,
      path: "/transaction/initialize",
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const req = await https
      .request(options, (response) => {
        response.on("data", (chunk) => {
          data += chunk;
          result = JSON.parse(data);
        });

        response.on("end", async () => {
          let reference = result.data.reference;

          await Paystack.transaction.verify(reference).then((transaction) =>
            transaction.data.status === "success"
              ? res.status(200).json({
                  success: true,
                  message: "donation successful",
                  result,
                })
              : res.status(200).json({
                  success: false,
                  message: "donation not successful",
                  result,
                })
          );
        });
      })
      .on("error", (err) => {
        error.error(err, next);
      });

    req.write(params);
    req.end();
  } catch (err) {
    error.error(err, next);
  }
};
