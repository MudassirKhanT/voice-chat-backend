const hashService = require("../services/hash-service");
const otpService = require("../services/otp-service");
const userService = require("../services/user-service");
const tokenService = require("../services/token-service");

const UserDto = require("../dtos/user-dto");
class AuthController {
  async sendOtp(req, res) {
    //Logic
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ message: "phone feild is required" });
    }
    // Generate 4 digit random number
    const otp = await otpService.generateOtp();
    //Expiry time
    const ttl = 1000 * 60 * 2;
    const expires = Date.now() + ttl;
    const data = `${phone}.${otp}.${expires}`;
    //Hash otp
    const hash = hashService.hashOtp(data);
    //send otp
    try {
      //await otpService.sendBySms(phone, otp);
      return res.json({
        hash: `${hash}.${expires}`,
        phone,
        otp,
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "message sending failed" });
    }
    //Hash is combination of phone number otp and expiry time
    res.json({ hash: hash });
  }
  async verifyOtp(req, res) {
    const { otp, phone, hash } = req.body;
    console.log(typeof hash);
    if (!otp || !phone || !hash) {
      res.status(400).json("All fields are requried");
    }
    let splitted = hash.split(".");
    let hashedOtp = splitted[0];
    let expires = splitted[1];
    if (Date.now() > +expires) {
      return res.status(400).json("Otp expired");
    }
    const data = `${phone}.${otp}.${expires}`;
    const isValid = otpService.verifyOtp(hashedOtp, data);
    if (!isValid) {
      return res.status(400).json({ message: "Inavlid OTP" });
    }
    let user;

    try {
      user = await userService.findUser({ phone: phone });
      if (!user) {
        user = await userService.createUser({ phone: phone });
      }
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Db Error" });
    }

    // Access Token
    const { accessToken, refreshToken } = await tokenService.generateTokens({ _id: user._id, activated: false });
    res.cookie("refreshtoken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    });

    const userDto = new UserDto(user);

    res.json({ accessToken, user: userDto });
  }
}

module.exports = new AuthController();
