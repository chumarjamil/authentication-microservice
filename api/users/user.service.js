const { resolve } = require("@sentry/utils");
const pool = require("../../config/database");

module.exports = {
  create: async (data) => {
    try {
      const result = await pool.query(
        `insert into customers(email, password, phone) 
                          values(?,?,?)`,
        [data.email, data.password, data.phone]
      );
      return result;
    } catch (error) {
      throw error;
    }
  },

  getUsers: async (email, phone) => {
    let query = "SELECT id, email, phone FROM customers WHERE 1=1";
    let queryParams = [];

    if (email) {
      query += " AND email = ?";
      queryParams.push(email);
    }

    if (phone) {
      query += " AND phone = ?";
      queryParams.push(phone);
    }

    return new Promise((resolve, reject) => {
      pool.query(query, queryParams, (error, results, fields) => {
        if (error) {
          return reject(error);
        }
        return resolve(results);
      });
    });
  },

  getUserById: (id) => {
    return new Promise((resolve, reject) => {
      pool.query(
        `select id, email, phone from customers where id = ?`,
        [id],
        (error, results, fields) => {
          if (error) {
            return reject(error);
          }
          return resolve(results[0]);
        }
      );
    });
  },

  checkEmail: (email) => {
    return new Promise((resolve, reject) => {
      pool.query(
        `SELECT * FROM customers WHERE email = ?`,
        [email],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results[0]);
        }
      );
    });
  },

  getUserByEmailOrPhone: (email, phone) => {
    return new Promise((resolve, reject) => {
      pool.query(
        `SELECT * FROM customers WHERE email = ? OR phone = ?`,
        [email, phone],
        (error, results, fields) => {
          if (error) {
            return reject(error);
          }
          return resolve(results[0]);
        }
      );
    });
  },

  checkPhone: (phone) => {
    return new Promise((resolve, reject) => {
      pool.query(
        `SELECT * FROM customers WHERE phone = ?`,
        [phone],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results[0]);
        }
      );
    });
  },

  updateOtp: (otp, email) => {
    const updateOtpQuery =
      "UPDATE customers SET otp = ?, otp_timestamp = NOW() WHERE email = ?";
    return new Promise((resolve, reject) => {
      pool.query(updateOtpQuery, [otp, email], (error, results) => {
        if (error) reject(error);
        resolve(results);
      });
    });
  },

  verfiedOTP: (otp) => {
    const updateOtpQuery = "UPDATE customers SET verified = 1 WHERE OTP=?";
    return new Promise((resolve, reject) => {
      pool.query(updateOtpQuery, [otp], (error, results) => {
        if (error) reject(error);
        resolve(results);
      });
    });
  },

  verifiedPhone: (phone) => {
    const updateOtpQuery =
      "UPDATE customers SET verified_phone = 1 WHERE phone=?";
    return new Promise((resolve, reject) => {
      pool.query(updateOtpQuery, [phone], (error, results) => {
        if (error) reject(error);
        resolve(results);
      });
    });
  },

  verifiyPhoneWA: (phone) => {
    const updateOtpQuery =
      "UPDATE customers SET verified_phone = 1 WHERE phone=?";
    return new Promise((resolve, reject) => {
      pool.query(updateOtpQuery, [phone], (error, results) => {
        if (error) reject(error);
        resolve(results);
      });
    });
  },

  getOTPForUser: (otp) => {
    return new Promise((resolve, reject) => {
      pool.query(
        `SELECT * FROM customers WHERE otp = ?`,
        [otp],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results[0]);
        }
      );
    });
  },

  checkUserVerfieid: (email) => {
    return new Promise((resolve, reject) => {
      pool.query(
        `SELECT * FROM customers WHERE email = ? AND verified = 1`,
        [email],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results[0]);
        }
      );
    });
  },

  forgotOTP: (forgot_otp, email) => {
    const updateOtpQuery =
      "UPDATE customers SET forgot_otp = ? WHERE email = ?";
    return new Promise((resolve, reject) => {
      pool.query(updateOtpQuery, [forgot_otp, email], (error, results) => {
        if (error) reject(error);
        resolve(results);
      });
    });
  },

  getOTPForgotPassword: (forgot_otp) => {
    return new Promise((resolve, reject) => {
      pool.query(
        `SELECT * FROM customers WHERE forgot_otp = ?`,
        [forgot_otp],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results[0]);
        }
      );
    });
  },

  changePassword: (password, email) => {
    const updatePasswordQuery =
      "UPDATE customers SET password = ? WHERE email = ?";
    return new Promise((resolve, reject) => {
      pool.query(updatePasswordQuery, [password, email], (error, results) => {
        if (error) reject(error);
        resolve(results);
      });
    });
  },
};
