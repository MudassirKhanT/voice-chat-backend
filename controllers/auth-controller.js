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
      return res.status(400).json({ message: "phone feild is required" });
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
      return res.status(500).json({ message: "message sending failed" });
    }
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
    //Storing refresh token in database
    await tokenService.storeRefreshToken(refreshToken, user._id);
    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    });
    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    });
    const userDto = new UserDto(user);

    return res.json({ user: userDto, auth: true });
  }
  async refresh(req, res) {
    // get refresh token from cookie
    const { refreshToken: refreshTokenFromCookie } = req.cookies;
    //check if refresh token is valid
    let userData;
    try {
      userData = await tokenService.verifyRefreshToken(refreshTokenFromCookie);
    } catch (err) {
      return res.status(401).json({ message: "Invalid Token" });
    }
    //check if refresh token is present in database or not
    try {
      const token = await tokenService.findRefreshToken(userData._id, refreshTokenFromCookie);
      if (!token) {
        return res.status(401).json({ message: "Invalid Token" });
      }
    } catch (err) {
      return res.status(500).json({ message: "Internal Error" });
    }
    //check if valid user
    const user = await userService.findUser({ _id: userData._id });
    if (!user) {
      return res.status(404).json({ message: "No user" });
    }
    //Generete new token
    const { refreshToken, accessToken } = await tokenService.generateTokens({ _id: userData._id });
    //update refresh token
    try {
      await tokenService.updateRefreshToken(refreshToken, userData._id);
    } catch (err) {
      return res.status(500).json({ message: "Internal Error" });
    }
    //console.log("tokens", refreshToken, accessToken);
    //put token in cokkie
    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    });
    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    });
    //response
    const userDto = new UserDto(user);
    return res.json({ user: userDto, auth: true });
  }
  async logout(req, res) {
    const { refreshToken } = req.cookies;
    //delete refresh token from db
    await tokenService.removeToken(refreshToken);
    //delete cookie
    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");
    res.json({ user: null, auth: false });
  }
}

module.exports = new AuthController();
