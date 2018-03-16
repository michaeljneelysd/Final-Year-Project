import * as async from "async";
import * as crypto from "crypto";
import * as express from "express";
import * as nodemailer from "nodemailer";
import * as passport from "passport";
import { User, UserModel, AuthToken, Profile } from "../models/User";
import { Request, Response, NextFunction } from "express";
import { IVerifyOptions } from "passport-local";
import { WriteError } from "mongodb";
const request = require("express-validator");
import { accessControl } from "../app";
import * as userService from "../services/user";
import { asyncMiddleware } from "../utils/asyncMiddleware";
import * as passportConfig from "../config/passport";

/**
 * GET /login
 * Login page.
 */
export let getLogin = (req: Request, res: Response) => {
    if (req.user) {
        return res.redirect("/");
    }
    res.render("account/login", {
        title: "Login"
    });
};

/**
 * POST /login
 * Sign in using email and password.
 */
export let postLogin = (req: Request, res: Response, next: NextFunction) => {
    req.assert("email", "Email is not valid").isEmail();
    req.assert("password", "Password cannot be blank").notEmpty();
    req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

    const errors = req.validationErrors();

    if (errors) {
        req.flash("errors", errors);
        return res.redirect("/login");
    }

    passport.authenticate("local", (err: Error, user: any, info: IVerifyOptions) => {
        if (err) { return next(err); }
        if (!user) {
            req.flash("errors", info.message);
            return res.redirect("/login");
        }
        req.logIn(user, (err) => {
            if (err) { return next(err); }
            req.flash("success", { msg: "Success! You are logged in." });
            res.redirect(req.session.returnTo || "/");
        });
    })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
export let logout = (req: Request, res: Response) => {
  req.logout();
  res.redirect("/");
};

/**
 * GET /signup
 * Signup page.
 */
export let getSignup = (req: Request, res: Response) => {
  if (req.user) {
    return res.redirect("/");
  }
  res.render("account/signup", {
    title: "Create Account"
  });
};

/**
 * POST /signup
 * Create a new local account.
 */
async function postSignup(req: Request, res: Response) {
    req.assert("email", "Email is not valid").isEmail();
    req.assert("password", "Password must be at least 4 characters long").len({ min: 4 });
    req.assert("confirmPassword", "Passwords do not match").equals(req.body.password);
    req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

    const errors = req.validationErrors();

    if (errors) {
      req.flash("errors", errors);
      return res.redirect("/signup");
    }

    try {
      const user = await userService.signup(req.body.email, req.body.password, "user");
      req.logIn(user, (err) => {
        if (err) {
          return Promise.reject(err);
        }
        return res.redirect("/");
      });
    } catch (error) {
      req.flash("errors", { msg: error });
      return res.redirect("/signup");
    }
}

/**
 * GET /account
 * Profile page.
 */
export let getAccount = (req: Request, res: Response) => {
  const permission = accessControl.can(req.user.role).readOwn("account");
  if (permission.granted) {
    res.render("account/profile", {
      title: "Account Management"
    });
  } else {
    res.status(403).send("Access Denied");
  }
};

/**
 * POST /account/profile
 * Update profile information.
 */
export async function postUpdateProfile(req: Request, res: Response) {
  req.assert("email", "Please enter a valid email address.").isEmail();
  req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash("errors", errors);
    return res.redirect("/account");
  }

  try {
      const email = req.body.email || "";
      const profile = {
          name: req.body.name || "",
          gender: req.body.gender || "",
          location: req.body.location || "",
          website: req.body.website || "",
      } as Profile;

      await userService.updateProfile(req.user.id, email, profile);

      req.flash("success", { msg: "Profile information has been updated." });
      res.redirect("/account");

  } catch (err) {
      req.flash("errors", {msg: err});
      return res.redirect("/account");
  }
}

/**
 * POST /account/password
 * Update current password.
 */
//
// export let postUpdatePassword = (req: Request, res: Response, next: NextFunction) => {
//   req.assert("password", "Password must be at least 4 characters long").len({ min: 4 });
//   req.assert("confirmPassword", "Passwords do not match").equals(req.body.password);

//   const errors = req.validationErrors();

//   if (errors) {
//     req.flash("errors", errors);
//     return res.redirect("/account");
//   }

//   User.findById(req.user.id, (err, user: UserModel) => {
//     if (err) { return next(err); }
//     user.password = req.body.password;
//     user.save((err: WriteError) => {
//       if (err) { return next(err); }
//       req.flash("success", { msg: "Password has been changed." });
//       res.redirect("/account");
//     });
//   });
// };

// /**
//  * POST /account/delete
//  * Delete user account.
//  */
// export let postDeleteAccount = (req: Request, res: Response, next: NextFunction) => {
//   User.remove({ _id: req.user.id }, (err) => {
//     if (err) { return next(err); }
//     req.logout();
//     req.flash("info", { msg: "Your account has been deleted." });
//     res.redirect("/");
//   });
// };

// /**
//  * GET /account/unlink/:provider
//  * Unlink OAuth provider.
//  */
// export let getOauthUnlink = (req: Request, res: Response, next: NextFunction) => {
//   const provider = req.params.provider;
//   User.findById(req.user.id, (err, user: any) => {
//     if (err) { return next(err); }
//     user[provider] = undefined;
//     user.tokens = user.tokens.filter((token: AuthToken) => token.kind !== provider);
//     user.save((err: WriteError) => {
//       if (err) { return next(err); }
//       req.flash("info", { msg: `${provider} account has been unlinked.` });
//       res.redirect("/account");
//     });
//   });
// };

// /**
//  * GET /reset/:token
//  * Reset Password page.
//  */
// export let getReset = (req: Request, res: Response, next: NextFunction) => {
//   if (req.isAuthenticated()) {
//     return res.redirect("/");
//   }
//   User
//     .findOne({ passwordResetToken: req.params.token })
//     .where("passwordResetExpires").gt(Date.now())
//     .exec((err, user) => {
//       if (err) { return next(err); }
//       if (!user) {
//         req.flash("errors", { msg: "Password reset token is invalid or has expired." });
//         return res.redirect("/forgot");
//       }
//       res.render("account/reset", {
//         title: "Password Reset"
//       });
//     });
// };

// /**
//  * POST /reset/:token
//  * Process the reset password request.
//  */
// export let postReset = (req: Request, res: Response, next: NextFunction) => {
//   req.assert("password", "Password must be at least 4 characters long.").len({ min: 4 });
//   req.assert("confirm", "Passwords must match.").equals(req.body.password);

//   const errors = req.validationErrors();

//   if (errors) {
//     req.flash("errors", errors);
//     return res.redirect("back");
//   }

//   async.waterfall([
//     function resetPassword(done: Function) {
//       User
//         .findOne({ passwordResetToken: req.params.token })
//         .where("passwordResetExpires").gt(Date.now())
//         .exec((err, user: any) => {
//           if (err) { return next(err); }
//           if (!user) {
//             req.flash("errors", { msg: "Password reset token is invalid or has expired." });
//             return res.redirect("back");
//           }
//           user.password = req.body.password;
//           user.passwordResetToken = undefined;
//           user.passwordResetExpires = undefined;
//           user.save((err: WriteError) => {
//             if (err) { return next(err); }
//             req.logIn(user, (err) => {
//               done(err, user);
//             });
//           });
//         });
//     },
//     function sendResetPasswordEmail(user: UserModel, done: Function) {
//       const transporter = nodemailer.createTransport({
//         service: "SendGrid",
//         auth: {
//           user: process.env.SENDGRID_USER,
//           pass: process.env.SENDGRID_PASSWORD
//         }
//       });
//       const mailOptions = {
//         to: user.email,
//         from: "express-ts@starter.com",
//         subject: "Your password has been changed",
//         text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`
//       };
//       transporter.sendMail(mailOptions, (err) => {
//         req.flash("success", { msg: "Success! Your password has been changed." });
//         done(err);
//       });
//     }
//   ], (err) => {
//     if (err) { return next(err); }
//     res.redirect("/");
//   });
// };

// /**
//  * GET /forgot
//  * Forgot Password page.
//  */
// export let getForgot = (req: Request, res: Response) => {
//   if (req.isAuthenticated()) {
//     return res.redirect("/");
//   }
//   res.render("account/forgot", {
//     title: "Forgot Password"
//   });
// };

// /**
//  * POST /forgot
//  * Create a random token, then the send user an email with a reset link.
//  */
// export let postForgot = (req: Request, res: Response, next: NextFunction) => {
//   req.assert("email", "Please enter a valid email address.").isEmail();
//   req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

//   const errors = req.validationErrors();

//   if (errors) {
//     req.flash("errors", errors);
//     return res.redirect("/forgot");
//   }

//   async.waterfall([
//     function createRandomToken(done: Function) {
//       crypto.randomBytes(16, (err, buf) => {
//         const token = buf.toString("hex");
//         done(err, token);
//       });
//     },
//     function setRandomToken(token: AuthToken, done: Function) {
//       User.findOne({ email: req.body.email }, (err, user: any) => {
//         if (err) { return done(err); }
//         if (!user) {
//           req.flash("errors", { msg: "Account with that email address does not exist." });
//           return res.redirect("/forgot");
//         }
//         user.passwordResetToken = token;
//         user.passwordResetExpires = Date.now() + 3600000; // 1 hour
//         user.save((err: WriteError) => {
//           done(err, token, user);
//         });
//       });
//     },
//     function sendForgotPasswordEmail(token: AuthToken, user: UserModel, done: Function) {
//       const transporter = nodemailer.createTransport({
//         service: "SendGrid",
//         auth: {
//           user: process.env.SENDGRID_USER,
//           pass: process.env.SENDGRID_PASSWORD
//         }
//       });
//       const mailOptions = {
//         to: user.email,
//         from: "hackathon@starter.com",
//         subject: "Reset your password on Hackathon Starter",
//         text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
//           Please click on the following link, or paste this into your browser to complete the process:\n\n
//           http://${req.headers.host}/reset/${token}\n\n
//           If you did not request this, please ignore this email and your password will remain unchanged.\n`
//       };
//       transporter.sendMail(mailOptions, (err) => {
//         req.flash("info", { msg: `An e-mail has been sent to ${user.email} with further instructions.` });
//         done(err);
//       });
//     }
//   ], (err) => {
//     if (err) { return next(err); }
//     res.redirect("/forgot");
//   });
// };

const userAPI = express.Router();
userAPI.get("/login", getLogin);
userAPI.post("/login", postLogin);
userAPI.get("/logout", logout);
// userAPI.get("/forgot", userController.getForgot);
// userAPI.post("/forgot", userController.postForgot);
// userAPI.get("/reset/:token", userController.getReset);
// userAPI.post("/reset/:token", userController.postReset);
userAPI.get("/signup", getSignup);
userAPI.post("/signup", asyncMiddleware(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return postSignup(req, res);
}));
userAPI.post("/account/profile", passportConfig.isAuthenticated, asyncMiddleware(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return postUpdateProfile(req, res);
}));
export default userAPI;