const {
  create,
  getUserById,
  getUsers,
  getUserByEmailOrPhone,
  checkEmail,
  checkPhone,
  updateOtp,
  getOTPForUser,
  forgotOTP,
  getOTPForgotPassword,
  changePassword,
  verfiedOTP,
  verifiedPhone,
  verifiyPhoneWA,
  checkUserVerfieid,
} = require("./user.service");
const { genSaltSync, hashSync, compareSync } = require("bcrypt");
const { sign } = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const https = require("https");
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const [Email_template, Forgot_password_template, Delete_account_template] = [
  fs.readFileSync(path.resolve(__dirname, "template/email.html"), "utf-8"),
  fs.readFileSync(
    path.resolve(__dirname, "template/forgot-password.html"),
    "utf-8"
  ),
  fs.readFileSync(
    path.resolve(__dirname, "template/delete-account.html"),
    "utf-8"
  ),
];

module.exports = {
  createUser: async (req, res) => {
    try {
      const body = req.body;
      const { email, password, phone } = body;

      if (!email || !password || !phone) {
        return res.status(400).json({
          success: 0,
          message:
            "Please fill in all mandatory fields: email, password, and phone number",
        });
      }

      const emailExists = await checkEmail(email);
      const formattedPhone = phone.replace(/^0/, "+62");
      const phoneExists = await checkPhone(formattedPhone);

      if (emailExists || phoneExists) {
        const message = emailExists
          ? "Email already exists"
          : "Phone number already exists";
        return res.status(400).json({
          success: 0,
          message,
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: 0,
          message: "Password must be at least 8 characters long",
        });
      }

      const salt = genSaltSync(10);
      const hashedPassword = hashSync(password, salt);
      const results = await create({
        ...body,
        phone: formattedPhone,
        password: hashedPassword,
      });

      return res.status(200).json({
        success: 1,
        message: "User created successfully!",
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: "Database connection error",
      });
    }
  },

  getUserById: async (req, res) => {
    const id = req.params.id;
    try {
      const results = await getUserById(id);
      if (!results) {
        return res.status(400).json({
          success: 0,
          message: "Record not Found!",
        });
      }
      return res.json({
        success: 1,
        data: results,
      });
    } catch (err) {
      console.log(err);
    }
  },

  getUsers: async (req, res) => {
    const { email, phone } = req.body;
  
    if (email && phone && typeof email === "string" && typeof phone === "string") {
      return res.status(400).json({
        success: 0,
        data: "Please provide either email or phone number, not both.",
      });
    }
  
    if ((!email || typeof email !== "string") && (!phone || typeof phone !== "string")) {
      return res.status(400).json({
        success: 0,
        data: "Please provide either email or phone number.",
      });
    }
  
    if (email && typeof email !== "string") {
      return res.status(400).json({
        success: 0,
        data: "Please fill email in email payload.",
      });
    }
  
    if (phone && typeof phone !== "string") {
      return res.status(400).json({
        success: 0,
        data: "Please fill phone in phone payload.",
      });
    }
  
    try {
      const result = await getUsers(email, phone);
  
      if(!result) {
        return res.status(400).json({
          success: 0,
          data: "No data found",
        });
      }
      return res.json({
        success: 1,
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: 0,
        data: "Something went wrong!",
      });
    }
  },  

  login: async (req, res) => {
    const { email, phone, password } = req.body;
    try {
      let user;
      if (phone) {
        let formattedPhone = phone;
        if (phone.startsWith("0")) {
          formattedPhone = "+62" + phone.slice(1);
        }
        user = await getUserByEmailOrPhone(email, formattedPhone);
      } else {
        user = await getUserByEmailOrPhone(email);
      }
      if (!user) {
        return res.status(400).json({
          success: 0,
          data: "Invalid email or phone or password",
        });
      }
      const result = compareSync(password, user.password);
      if (result) {
        user.password = undefined;
        const jsontoken = sign({ result: user }, process.env.JWT_KEY, {
          expiresIn: "30d", // expiration time to one month
        });

        // Check the login endpoint from Admin API
        try {
          const response = await axios.get(API_ENDPOINT);
          if (response.status === 200) {
            return res.status(200).json({
              success: 1,
              message: "login successfully",
              data
            });
          }
          if (response.status === 400) {
            return res.status(400).json({
              success: 0,
              message: "User not found",
            });
          }
        } catch (error) {
          console.log(error);
          return res.status(500).json({
            success: 0,
            data: "Error while checking the endpoint",
          });
        }
        return res.status(200).json({
          success: 1,
          message: "login successfully",
          token: jsontoken,
        });
      } else {
        return res.status(400).json({
          success: 0,
          data: "Invalid email or phone or password",
        });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        data: "Internal server error",
      });
    }
  },

  checkEmailQuery: async (req, res) => {
    const body = req.body;
    try {
      const results = await checkEmail(body.email);
      if (!results) {
        return res.status(400).json({
          success: 0,
          data: "Email not found",
        });
      }

      // Generate the OTP
      const otp = Math.floor(100000 + Math.random() * 900000);

      // Save the OTP to the database
      await updateOtp(otp, body.email);

      // Send the OTP to the email
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
          user: process.env.SMTP_AUTH_USER,
          pass: process.env.SMTP_AUTH_PASS,
        },
      });

      const mailOptions = {
        from: "microservice Info <info@microservice.co.id>",
        to: body.email,
        subject: "OTP untuk verifikasi email",
        html: Email_template.replace("${otp}", otp).replace(
          "${email}",
          body.email
        ),
      };
      transporter.sendMail(mailOptions, (error) => {
        if (error) {
          return res.status(500).json({
            success: 0,
            message: "Failed to send OTP",
          });
        }
        return res.status(200).send({
          success: 1,
          message: "OTP sent to email",
        });
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: "An error occurred",
      });
    }
  },

  VerifyOTP: async (req, res) => {
    const { otp } = req.body;
    try {
      const dbResult = await getOTPForUser(otp);

      if (dbResult && dbResult.otp === otp) {
        // OTP is valid
        const addVerify = await verfiedOTP(otp);
        if (addVerify.affectedRows > 0) {
          return res.status(200).json({
            success: 1,
            message: "OTP verification successful!",
          });
        } else {
          return res.status(500).json({
            success: 0,
            message: "Failed to update user verification status",
          });
        }
      } else {
        // OTP is invalid
        return res.status(400).json({
          success: 0,
          data: "Invalid OTP",
        });
      }
    } catch (error) {
      console.error(error);

      if (error.message === "User not found") {
        return res.status(400).json({
          success: 0,
          message: "User not found",
        });
      } else {
        return res.status(400).json({
          success: 0,
          message: "OTP expired",
        });
      }
    }
  },

  forgotPassword: async (req, res) => {
    const body = req.body;
    try {
      const results = await checkEmail(body.email);
      if (!results) {
        return res.status(400).json({
          success: 0,
          data: "Email not found",
        });
      }

      // Generate the OTP
      const forgot_otp = Math.floor(100000 + Math.random() * 900000);

      // Save the OTP to the database
      await forgotOTP(forgot_otp, body.email);

      // Send the OTP to the email
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
          user: process.env.SMTP_AUTH_USER,
          pass: process.env.SMTP_AUTH_PASS,
        },
      });

      const mailOptions = {
        from: "microservice Info <info@microservice.co.id>",
        to: body.email,
        subject: "OTP untuk Mengubah Password",
        html: Forgot_password_template.replace("${otp}", forgot_otp).replace(
          "${email}",
          body.email
        ),
      };
      transporter.sendMail(mailOptions, (error) => {
        if (error) {
          return res.status(500).json({
            success: 0,
            message: "Failed to send OTP",
          });
        }
        return res.status(200).json({
          success: 1,
          message: "OTP sent to email",
        });
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: "An error occurred",
      });
    }
  },

  forgotPasswordVerifyOTP: async (req, res) => {
    const { forgot_otp } = req.body;
    try {
      const dbResult = await getOTPForgotPassword(forgot_otp);

      if (dbResult && dbResult.forgot_otp === forgot_otp) {
        // OTP is valid
        return res.status(200).json({
          success: 1,
          message: "OTP verification successful!",
        });
      } else {
        // OTP is invalid
        return res.status(400).json({
          success: 0,
          message: "Invalid OTP",
        });
      }
    } catch (error) {
      console.error(error);

      if (error.message === "User not found") {
        return res.status(400).json({
          success: 0,
          message: "User not found",
        });
      } else {
        return res.status(500).json({
          success: 0,
          message: "OTP expired",
        });
      }
    }
  },

  updatePassword: async (req, res) => {
    try {
      const body = req.body;
      const emailExists = await checkEmail(body.email);

      if (!emailExists) {
        return res.status(400).json({
          success: 0,
          message: "Email doesn't exist",
        });
      }
      if (body.password.length < 8) {
        return res.status(400).json({
          success: 0,
          message: "Password must be at least 8 characters long",
        });
      }

      const salt = genSaltSync(10);
      body.password = hashSync(body.password, salt);
      await changePassword(body.password, body.email);
      return res.status(200).json({
        success: 1,
        message: "Password updated sucessfully!",
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: "Database connection error",
      });
    }
  },

  Verification: async (req, res) => {
    const { email } = req.body;
    try {
      const dbResult = await checkUserVerfieid(email);

      if (dbResult && dbResult.email === email) {
        return res.status(200).json({
          success: 1,
          message: "User verfied!",
        });
      } else {
        // OTP is invalid
        return res.status(400).json({
          success: 0,
          message: "User not verfied",
        });
      }
    } catch (error) {
      console.error(error);

      if (error.message === "User not found") {
        return res.status(400).json({
          success: 0,
          message: "User not found",
        });
      } else {
        return res.status(500).json({
          success: 0,
          message: "User OTP expired",
        });
      }
    }
  },

  sendOTPPhone: async (req, res) => {
    const { msisdn } = req.body;
    const data = JSON.stringify({
      msisdn,
      template: `Kode OTP Anda adalah $OTP Kode ini hanya berlaku selama 5 menit. Jangan berikan kode OTP ke orang lain. Terima kasih telah menggunakan microservice App!`,
      time_limit: "300",
      challenge: "update_account",
    });

    if (!msisdn) {
      return res.status(400).json({
        success: 0,
        message: "Phone number is required",
      });
    }

    const options = {
      hostname: "api.verihubs.com",
      path: "/v1/otp/send",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
        "App-ID": process.env.App_ID_Verihubs,
        "API-Key": process.env.API_Key_Verihubs,
      },
    };

    const externalRequest = https.request(options, (externalResponse) => {
      let responseData = "";

      externalResponse.on("data", (chunk) => {
        responseData += chunk;
      });

      externalResponse.on("end", () => {
        console.log(JSON.parse(responseData));
        return res.status(200).json({
          success: 1,
          message: "External API response: " + responseData,
        });
      });
    });

    externalRequest.on("error", (error) => {
      console.error(error);

      return res.status(500).json({
        success: 0,
        message: "Error",
      });
    });

    externalRequest.write(data);
    externalRequest.end();
  },

  verifyOTPPhone: async (req, res) => {
    const { msisdn, otp } = req.body;
    const data = JSON.stringify({
      msisdn,
      challenge: "update_account",
      otp,
    });

    if (!msisdn || !otp) {
      const missingFields = [];
      if (!msisdn) {
        missingFields.push("Phone number");
      }
      if (!otp) {
        missingFields.push("OTP");
      }
      return res.status(400).json({
        success: 0,
        message: `${missingFields.join(" and ")} ${
          missingFields.length > 1 ? "are" : "is"
        } required`,
      });
    }

    const options = {
      hostname: "api.verihubs.com",
      path: "/v1/otp/verify",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
        "App-ID": process.env.App_ID_Verihubs,
        "API-Key": process.env.API_Key_Verihubs,
      },
    };

    const externalRequest = https.request(options, (externalResponse) => {
      let responseData = "";

      externalResponse.on("data", (chunk) => {
        responseData += chunk;
      });

      externalResponse.on("end", () => {
        //check status code we recieved from verihubs
        //if status 200 == success
        //if not != success
        if(externalResponse.statusCode == 200){
          const updateToVerivied = verifiedPhone(msisdn);

          return res.status(200).json({
            success: 1,
            message: "External API response: " + responseData,
          });
        }else{
          return res.status(externalResponse.statusCode).json({
            success: 0,
            message: "External API response: " + responseData,
          });
        }
      });
    });

    externalRequest.on("error", (error) => {
      console.error(error);

      return res.status(500).json({
        success: 0,
        message: "Error",
      });
    });

    externalRequest.write(data);
    externalRequest.end();
  },

  sendWAOTP: async (req, res) => {
    const { msisdn } = req.body;
    const data = JSON.stringify({
      msisdn,
      template_name: "otpmicroservice",
      lang_code: "id",
      time_limit: "300",
      challenge: "update_account",
    });

    if (!msisdn) {
      return res.status(400).json({
        success: 0,
        message: "Phone number is required",
      });
    }

    const options = {
      hostname: "api.verihubs.com",
      path: "/v1/whatsapp/otp/send",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
        "App-ID": process.env.App_ID_Verihubs,
        "API-Key": process.env.API_Key_Verihubs,
      },
    };

    const externalRequest = https.request(options, (externalResponse) => {
      let responseData = "";

      externalResponse.on("data", (chunk) => {
        responseData += chunk;
      });

      externalResponse.on("end", () => {
        console.log(JSON.parse(responseData));
        return res.status(200).json({
          success: 1,
          message: "External API response: " + responseData,
        });
      });
    });

    externalRequest.on("error", (error) => {
      console.error(error);

      return res.status(500).json({
        success: 0,
        message: "Error",
      });
    });

    externalRequest.write(data);
    externalRequest.end();
  },

  verifyWAOTP: async (req, res) => {
    const { msisdn, otp } = req.body;
    const data = JSON.stringify({
      msisdn,
      challenge: "update_account",
      otp,
    });

    if (!msisdn || !otp) {
      const missingFields = [];
      if (!msisdn) {
        missingFields.push("Phone number");
      }
      if (!otp) {
        missingFields.push("OTP");
      }
      return res.status(400).json({
        success: 0,
        message: `${missingFields.join(" and ")} ${
          missingFields.length > 1 ? "are" : "is"
        } required`,
      });
    }

    const options = {
      hostname: "api.verihubs.com",
      path: "/v1/whatsapp/otp/verify",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
        "App-ID": process.env.App_ID_Verihubs,
        "API-Key": process.env.API_Key_Verihubs,
      },
    };

    const externalRequest = https.request(options, (externalResponse) => {
      let responseData = "";

      externalResponse.on("data", (chunk) => {
        responseData += chunk;
      });

      externalResponse.on("end", () => {
        //check status code we recieved from verihubs
        //if status 200 == success
        //if not != success
        let updateToVeriviedWA = verifiyPhoneWA(msisdn);
        if(externalResponse.statusCode == 200){
          return res.status(200).json({
            success: 1,
            message: "External API response: " + responseData,
          });
        }else{
          return res.status(externalResponse.statusCode).json({
            success: 0,
            message: "External API response: " + responseData,
          });
        }
      });
    });

    externalRequest.on("error", (error) => {
      console.error(error);

      return res.status(500).json({
        success: 0,
        message: "Error",
      });
    });

    externalRequest.write(data);
    externalRequest.end();
  },

  deleteAccountRequest: async (req, res) => {
    const body = req.body;
    try {
      const results = await checkEmail(body.email);
      if (!results) {
        return res.status(400).json({
          success: 0,
          data: "Email not found",
        });
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
          user: process.env.SMTP_AUTH_USER,
          pass: process.env.SMTP_AUTH_PASS,
        },
      });

      const mailOptions = {
        from: "microservice Info <info@microservice.co.id>",
        to: body.email,
        subject: "Update Penghapusan Akun Anda",
        html: Delete_account_template.replace("${email}", body.email),
      };
      transporter.sendMail(mailOptions, (error) => {
        if (error) {
          return res.status(500).json({
            success: 0,
            message: "Failed to send Email",
          });
        }
        return res.status(200).send({
          success: 1,
          message: "Delete account request received",
        });
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: "An error occurred",
      });
    }
  },
};