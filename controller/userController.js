const config = require('config');
const domain = config.get('domain');
const joi = require('joi');
const permissions = config.get('permissions');
const user = require('../model/user');
const auth = require('../model/auth');
const invite = require('../model/invite');
const account = require('../model/account');
const mail = require('../helper/mail');
const s3 = require('../helper/s3');
const stripe = require('../model/stripe')
const speakeasy = require('speakeasy');
const randomstring = require('randomstring');
const qrcode = require('qrcode');
const Cryptr = require('cryptr');
const crypto = new Cryptr(process.env.CRYPTO_SECRET);
const token = require('../model/token');
const utility = require('../helper/utility');
const fileHelper = require('../helper/file');
const notification = require('../model/notification');
const authController = require('../controller/authController');

/*
* user.create()
* create a new user
*/

exports.create = async function(req, res){

  // validate
  const data = utility.validate(joi.object({
    
    email: joi.string().email().required(),
    name: joi.string().required().min(3).max(100),
    password: joi.string().required().pattern(new RegExp(config.get('security.password_rules'))).custom((value, helper) => {

      return value === helper.state.ancestors[0].email ? 
        helper.message(res.__('account.create.password_same_as_email')) : value;

    }),
    confirm_password: joi.string().allow(null),
    verify_view_url: joi.string(),
    invite_id: joi.string().required()

  }), req, res);

  // confirm_password field is a dummy field to prevent bot signups
  if (data.hasOwnProperty('confirm_password') && data.confirm_password)
    throw { message: res.__('user.create.denied') };

  // check the invite is valid
  const inviteData = await invite.get({ id: data.invite_id, email: data.email, used: false });
  utility.assert(inviteData, res.__('user.create.invalid_invite'))

  // check account has a plan
  const accountData = await account.get({ id: inviteData.account_id });
  utility.assert(accountData.plan, res.__('account.plan_required'));

  // check if the user already exists
  let userData = await user.get({ email: data.email });

  if (userData){

    // user is already on this account
    const userAccounts = await user.account({ id: userData.id });
    const registered = userAccounts.find(x => x.id === inviteData.account_id);
    utility.assert(!registered, res.__('user.create.duplicate'));

    if (userData.account_id === inviteData.account_id)
      throw ({ message: res.__('user.create.duplicate') })

    // user already owns a child account, verify password
    const verified = await user.password.verify({ id: userData.id, account: userData.account_id, password: data.password });
    utility.assert(verified, res.__('user.create.duplicate_child'))

    // flag for authController to notify onboarding ui
    // that the users existing account was used
    data.duplicate_user = true; 
    data.account_id = inviteData.account_id;
    data.has_password = userData.has_password;

    // save the new password if it exists and user doesn't have one
    if (!data.has_password && data.password)
      await user.password.save({ id: userData.id, password: data.password });

  }
  else {
   
    data.verified = !config.get('email').user_verification;
    userData = await user.create({ user: data, account: inviteData.account_id });

  }

  // add user to account, close invite and set noficiation defaults
  await user.account.add({ id: userData.id, account: inviteData.account_id, permission: inviteData.permission })
  await invite.update({ id: data.invite_id, data: { used: true, user_id: userData.id }});
  notification.create({ user: userData.id, account: inviteData.account_id, permission: inviteData.permission });

  // increment per-seat billing if active
  if (config.get('stripe').seat_billing && accountData.plan !== 'free'){

    const accountUsers = await account.users({ id: inviteData.account_id });
    const subscription = await stripe.subscription(accountData.stripe_subscription_id);
    await stripe.subscription.update({ subscription: subscription, quantity: accountUsers.length })

  }

  const verificationToken = auth.token({ data: { timestamp: Date.now(), user_id: userData.id }, duration: 3600 });
  const duplicateUser = (data.duplicate_user && data.has_password);

  // send verification email to user
  await mail.send({

    to: userData.email,
    locale: req.locale,
    template: duplicateUser ? 'duplicate_user' : (data.verified ? 'new_user' : 'email_verification'),    
    content: { 
      
      name: userData.name, 
      verification_token: verificationToken,
      domain: data.verified ? domain : utility.validateNativeURL(data.verify_view_url) || `${domain}/signup/verify`
    
    }
  });

  if (duplicateUser && !userData.verified){
    await mail.send({

      to: userData.email,
      locale: req.locale,
      template: 'new_user',    
      content: { name: userData.name, verification_token: verificationToken }
  
    });
  }

  // notify account owner
  const send = await notification.get({ account: accountData.id, name: 'invite_accepted' });

  if (send){
    await mail.send({

      to: accountData.owner_email,
      locale: req.locale,
      template: 'invite_accepted',
      content: {

        name: accountData.owner_name,
        friend: userData.name,
      
      }
    });
  }

  // authenticate the user
  console.log(res.__('user.log.created', { email: userData.email }));
  return authController.signup(req, res);

};

/*
* user.get()
* get a single user
*/

exports.get = async function(req, res){

  const id = req.params.id || req.user;
  utility.assert(id, res.__('user.invalid_id'))

  const userData = await user.get({ id: id, account: req.account });
  userData.accounts = await user.account({ id: id });

  if (req.permission === 'owner'){

    const accountData = await account.get({ id: req.account });
    userData.account_name = accountData.name;

  }

  return res.status(200).send({ data: userData });

}

/*
* user.update()
* update a user profile 
* handles permission checks
*/

exports.update = async function(req, res){

  let accountName;

  // validate
  let data = utility.validate(joi.object({
  
    id: joi.string(),
    email: joi.string().email(),
    name: joi.string().min(3).max(100),
    locale: joi.string(),
    permission: joi.string().valid(...Object.keys(config.get('permissions')).filter(key => key !== 'master' && key !== 'owner')),
    active: joi.alternatives().try(joi.boolean(), joi.number().valid(0, 1)), 
    default_account: joi.string(), 
    onboarded: joi.alternatives().try(joi.boolean(), joi.number().valid(0, 1)), 
    account_name: joi.string(),

  }), req, res);

  // remove multer wrapper
  data = utility.clean(data);
  
  let msg = data.id ? 
    res.__('user.update.user') : 
    (data.locale ? res.__({ phrase: 'user.update.language', locale: data.locale }) : res.__('user.update.profile'));
  
  const authError = { message: res.__('user.update.unauthorized') }

  const userId = data.id || req.user;
  utility.assert(userId, res.__('user.invalid_id_admin'));

  const userData = await user.get({ id: userId, account: req.account });
  utility.assert(userData, res.__('user.invalid'));

  // if changing email - check if it's already used
  if (data.hasOwnProperty('email') && data.email !== userData.email){

    const exists = await user.get({ email: data.email });
    if (exists) throw { inputError: 'email', message: res.__('user.update.duplicate_email') };

    // user must verify new email address
    data.verified = false;

    // signout other sessions
    const activeTokens = await token.get({ user: userId, active: true });
    const tokensToDeactivate = activeTokens.filter(x => x.id !== req.jit).map(x => x.id);
    await token.update({ id: tokensToDeactivate, data: { active: false }});

    // send the email
    const verificationToken = auth.token({ data: { timestamp: Date.now(), user_id: userData.id }, duration: 3600 });

    await mail.send({

      to: userData.email,
      locale: req.locale,
      template: 'email_verification',
      content: { 
        
        name: userData.name, 
        verification_token: verificationToken,
        domain: utility.validateNativeURL(data.verify_view_url) || `${domain}/signup/verify`
      
      }
    });
  }

  // prevent permission injections
  if (data.hasOwnProperty('permission') && (data.permission !== userData.permission)){

    // account owners can not adjust their own permission level
    if (userData.permission === 'owner' && req.permission === 'owner')
      throw { message: res.__('user.update.permission_error') }
        
    // master accounts can not be downgraded
    if (userData.permission === 'master' && req.permission === 'master')
      throw { message: res.__('user.update.permission_error') }

    // prevent escalating to owner/master
    if (data.permission === 'owner' || data.permission === 'master') 
      throw authError;

    // admins can not downgrade another admin account
    if (req.permission === 'admin' && userData.permission === 'admin' && data.permission !== 'admin')
      throw authError;

    // users can not edit their own permission
    if (data.permission !== 'user' && req.permission === 'user') 
      throw authError;

    // sign user out if permission changes to force them to get a new jwt
    await token.delete({ user: userId })

  }
  
  // only account owners can edit their own account
  if (userData.permission === 'owner' && req.permission !== 'owner')
    throw authError

  if (data.support_enabled)
    msg = res.__('user.update.support_access');

  // only owner can update account name
  if (data.account_name && req.permission === 'owner'){

    accountName = data.account_name;
    await account.update({ id: req.account, data: { name: data.account_name }})

  }

  // when changing default account, check user belongs to that account
  if (data.default_account && data.default_account !== userData.default_account){

    const userAccounts = await user.account({ id: userId });
    utility.assert(userAccounts.find(x => x.id === data.default_account), res.__('user.update.invalid_default_account'));

  }

  // upload the avatar
  if (req.files?.length){

    const file = req.files[0];
    fileHelper.assert.type({ file: file, type: ['jpg', 'png'] });
    
    // rename the file and upload
    fileHelper.rename({ folder: config.get('avatar').folder, file: file });
    const buffer = await fileHelper.resize({ file: file, w: config.get('avatar').size });
    data.avatar = await s3.upload({ file: file, buffer: buffer, acl: 'public-read' });

    // remove old avatar
    if (userData.avatar && userData.avatar.includes('amazonaws.com'))
      s3.delete({ url: userData.avatar }) 

    // remove the temp file
    fileHelper.delete(file.path);

  }

  // update the user
  data = await user.update({ id: userId, account: req.account, data: {
    
    ...data.name && { name: data.name },
    ...data.email && { email: data.email },
    ...data.locale && { locale: data.locale },
    ...data.avatar && { avatar: data.avatar },
    ...data.permission && { permission: data.permission },
    ...data.onboarded && { onboarded: data.onboarded },
    ...data.support_enabled && { support_enabled: data.support_enabled },
    ...data.default_account && { default_account: data.default_account }

  }});
 
  // format data for client
  if (accountName) data.account_name = accountName;  
  return res.status(200).send({ message: msg, data: data });

};

/*
* user.password()
* update password or create a new one if signed in via social
*/

exports.password = async function(req, res){

  let data, userData;

  // update an existing password
  if (req.body.has_password){

    // verify old password 
    data = utility.validate(joi.object({
  
      oldpassword: joi.string().required()
  
    }), req, res);
    
    userData = await user.password.verify({ id: req.user, account: req.account, password: data.oldpassword });
    utility.assert(userData, res.__('user.password.invalid'), 'oldpassword');

  }
  else {

    userData = await user.get({ id: req.user });

  }

  data = utility.validate(joi.object({
  
    oldpassword: joi.string().required(),
    newpassword: joi.string().required().pattern(new RegExp(config.get('security.password_rules'))),

  }), req, res);

  // check new password is not the same as the old one
  utility.assert(data.oldpassword !== data.newpassword, res.__('user.password.same'));

  // all ok - save the password
  await user.password.save({ id: req.user, password: data.newpassword });

  // notify user
  await mail.send({

    to: userData.email,
    locale: req.locale,
    template: 'password_updated',
    content: { name: userData.name }
    
  });

  // signout other sessions
  const activeTokens = await token.get({ user: req.user, active: true });
  const tokensToDeactivate = activeTokens.filter(x => x.id !== req.jit).map(x => x.id);
  await token.update({ id: tokensToDeactivate, data: { active: false }});

  return res.status(200).send({ message: res.__('user.password.saved') });

}

/*
* user.password.reset()
* reset the password
*/

exports.password.reset = async function(req, res){

  const data = utility.validate(joi.object({
  
    email: joi.string().email().required(),
    jwt: joi.string().required(),
    password: joi.string().required().pattern(new RegExp(config.get('security.password_rules'))),

  }), req, res);

  // verify the user exists
  const userData = await user.get({ email: data.email });

  if (userData){

    // verify the token
    const hash = await user.password({ id: userData.id, account: userData.account_id });
    const token = auth.token.verify({ token: data.jwt, secret: hash.password });

    // check ids match and emails 
    if ((token.user_id !== userData.id) || (data.email !== userData.email))
      throw { message: res.__('user.password.invalid_email') }

    if (token){

      // save new password and notify the user
      await user.password.save({ id: userData.id, password: data.password });
      await mail.send({

        to: userData.email,
        locale: req.locale,
        template: 'password_updated',
        content: {  
        
          token: token,
      
        }
      });

      // authenticate user
      return authController.signin(req, res);

    }
  }

  return res.status(401).send({ message: res.__('user.password.reset_denied') });

}

/*
* user.password.reset.request()
* request a password reset
*/

exports.password.reset.request = async function(req, res){

  const data = utility.validate(joi.object({
  
    email: joi.string().email().required(),
    resetpassword_view_url: joi.string()

  }), req, res);

  // check the user exists
  const userData = await user.get({ email: data.email });

  if (userData){

    // generate a JWT and sign it with the current
    // hashed password set to expire in 5 minutes
    const hash = await user.password({ id: userData.id, account: userData.account_id });
    const token = auth.token({ data: { timestamp: Date.now(), user_id: userData.id }, secret: hash.password, duration: 300 });

    // trigger a reset password email
    await mail.send({

      to: data.email,
      locale: req.locale,
      template: 'password_reset',
      content: {  
        
        token: token,
        domain: utility.validateNativeURL(data.resetpassword_view_url) || `${domain}/resetpassword`
    
      }
    });
  }

  // don't return any indication if the account exists or not
  return res.status(200).send({ message: res.__('user.password.check_email') });

}

/*
* user.verify()
* user verified their email address
*/

exports.verify = async function(req, res){

  const data = utility.validate(joi.object({
  
    token: joi.string().required(),

  }), req, res);

  // verify the user exists
  const userData = await user.get({ id: req.user });
  utility.assert(userData, res.__('user.invalid'));

  // verify the token
  const token = auth.token.verify({ token: data.token });

  // check ids match
  if (token.user_id !== userData.id)
    return res.status(401).send();

  if (token)
    user.update({ id: req.user, account: req.account, data: { verified: true }});

  // get the account
  const accountData = await account.get({ id: req.account });

  const jwt = auth.token({ data: { 
  
    accountId: userData.account_id, 
    userId: userData.id, 
    permission: userData.permission,
    provider: 'app' // always app when verifying email
  
  }});

  // send welcome email if new account with no plans
  // if account has a plan, user updated their email
  if (!accountData.plan){
    await mail.send({

      to: userData.email,
      locale: req.locale,
      template: 'new_account',
      content: { name: userData.name }

    });
  }

  // re-authenticate the user as verified (issues a new token)
  return res.status(200).send({ token: jwt, message: res.__('user.verify.verified') });
  
}

/*
* user.verify.request()
* user requested a new verification email
*/

exports.verify.request = async function(req, res){

  // validate
  const data = utility.validate(joi.object({
  
    verify_view_url: joi.string(),

  }), req, res);

  const userData = await user.get({ id: req.user })
  utility.assert(userData, res.__('user.invalid'));

  const verificationToken = auth.token({ data: { timestamp: Date.now(), user_id: userData.id }, duration: 3600 });

  await mail.send({

    to: userData.email,
    locale: req.locale,
    template: 'email_verification',
    content: { 
      
      name: userData.name, 
      verification_token: verificationToken,
      domain: utility.validateNativeURL(data.verify_view_url) || `${domain}/signup/verify` 
    
    }
  });
  
  return res.status(200).send({ 
    
    // send a token in test mode to enable testing script to verify
    ...process.env.TESTING && { verification_token: verificationToken },
    message: res.__('user.verify.check_email')
  
  });
}


/*
* user.2fa()
* enable 2fa for the user
* generate a secret/qr code
*/

exports['2fa'] = async function(req, res){

  const data = utility.validate(joi.object({
  
    '2fa_enabled': joi.boolean().required()

  }), req, res);

  // user enabled 2fa
  if (data['2fa_enabled']){

    // generate a secret and qr code
    const secret = speakeasy.generateSecret({ length: 32, name: process.env.APP_NAME });
    await user.update({ id: req.user, account: req.account, data: { '2fa_secret': crypto.encrypt(secret.base32) }});
    data.qr_code = await qrcode.toDataURL(secret.otpauth_url);
    data.otpauth = secret.otpauth_url; 
    
  }
  else {

    // disable it
    await user.update({ id: req.user, account: req.account, data: { 
      
      '2fa_enabled': false,
      '2fa_secret': null,
      '2fa_backup_code': null
    
    }});
  }

  res.status(200).send({ data: data });

}

/*
* user.2fa()
* verify the users code and generate backup code
*/

exports['2fa'].verify = async function(req, res){

  const data = utility.validate(joi.object({
  
    code: joi.string().required()

  }), req, res);

  // verify the secret
  const secret = await user['2fa'].secret({ id: req.user });
  const verified = speakeasy.totp.verify({ secret: secret, encoding: 'base32', token: data.code.replace(/\s+/g, '') });
  utility.assert(verified, res.__('user.verify.invalid_code'));

  // secret was ok, enable 2fa and return backup code
  const backupCode = randomstring.generate({ length: 12 });
  await user.update({ id: req.user, account: req.account, data: { '2fa_enabled': true }});
  await user['2fa'].backup.save({ id: req.user, code: backupCode });

  res.status(200).send({ data: { backup_code: backupCode }});

}

/*
* user.delete()
* un-assign/delete the user
*/

exports.delete = async function(req, res){

  const id = req.params.id || req.user;
  let accountUsers, subscription, userAccounts;
  utility.assert(id, res.__('user.invalid'));

  // get the user
  const userData = await user.get({ id: id, account: req.account });
  utility.assert(userData, res.__('user.invalid'));

  // get the account;
  const accountData = await account.get({ id: req.account });
  const useSeatBilling = config.get('stripe').seat_billing && accountData.plan !== 'free';

  // user is closing account
  if (req.user === userData.id){

    const data = utility.validate(joi.object({ password: joi.string().required() }), req, res);
    const verified = await user.password.verify({ id: req.user, account: req.account, password: data.password });
    utility.assert(verified, res.__('user.delete.invalid_password'), 'password');

  }

  // user deleted via mission control
  if (req.permission === 'master'){

    const userData = await user.get({ id: id });
    utility.assert(userData.permission !== 'owner', res.__('user.delete.owner'));

    // stop master account deleting themselves
    if (userData.permission === 'master')
      return res.status(403).send({ message: res.__('user.delete.master') });

    userAccounts = await user.account({ id: userData.id });

    // downgrade any subscriptions
    for (ua of userAccounts){

      const accountData = await account.get({ id: ua.id });
      const useSeatBilling = config.get('stripe').seat_billing && accountData.plan !== 'free';
       
      if (useSeatBilling){

        const accountUsers = await account.users({ id: accountData.id });
        const subscription = await stripe.subscription(accountData.stripe_subscription_id);
        await stripe.subscription.update({ subscription: subscription, quantity: accountUsers.length-1 });

      }

      // delete the user completely
      await user.delete({ id: userData.id, account: accountData.id });

    }

    return res.status(200).send({ message: res.__('user.delete.accounts') });

  }

  // get the account and user list if using per-seat billing
  if (useSeatBilling){

    accountUsers = await account.users({ id: req.account });
    subscription = await stripe.subscription(accountData.stripe_subscription_id);

  }

  // owner is attempting to delete their own account
  if (req.permission === 'owner' && req.user === userData.id)
    throw { message: res.__('user.delete.owner_account') };

  if (req.permission === 'admin' && (req.user === userData.id) && data.id) 
    throw { message: res.__('user.delete.user_account') };
  
  if (userData.permission === 'owner')
    return res.status(403).send({ message: res.__('user.delete.owner_by_admin') });

  // user/owner/admin is deleting a user
  // un-assign user if attached multiple accounts, delete if only on one account
  userAccounts = await user.account({ id: userData.id });
  await token.delete({ user: userData.id });

  // user is on multiple accounts
  if (userAccounts.length > 1){
    
    // if this account is the user's default account
    // update to prevent a redundant default
    if (userData.default_account === req.account){

      userAccounts.splice(userAccounts.findIndex(x => x.id === req.account), 1);
      await user.update({ id: userData.id, account: req.account, data: { default_account: userAccounts[0].id }})

    }

    // un-assign user from this account
    await user.account.delete({ id: userData.id, account: req.account }); 

  }
  else {

    // delete the user entirely
    await user.delete({ id: userData.id, account: req.account });
    
    if (userData.avatar && userData.avatar.includes('amazonaws.com'))
      s3.delete({ url: userData.avatar }) 

  }

  // decrement per-seat billing if active
  if (useSeatBilling)
    await stripe.subscription.update({ subscription: subscription, quantity: accountUsers.length-1 });
  
  return res.status(200).send({ message: res.__('user.delete.deleted'), data: { signout: req.permission === 'admin' && userData.id === req.user }});

};

/*
* user.permissions()
* return available user permissions
*/

exports.permissions = async function(req, res){

  let perms = {...permissions }

  Object.keys(perms).map(perm => {

    if (perm === 'master') delete perms[perm];

  });

  return res.status(200).send({ data: perms });

}

/*
* user.accounts()
* return accounts this user belongs to
*/

exports.account = async function(req, res){

  const data = await user.account({ id: req.user });
  res.status(200).send({ data: data });

}