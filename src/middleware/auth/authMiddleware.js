// Updated authMiddleware.js to align with new Redis service store
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');
const { sendAuthEvent, receiveAuthResponse } = require('../../sqs/authSqsClient');
const { storeUniqueId, isUniqueIdValid } = require('../../utils/redisServiceStore');
const { AUTH_REFRESH_TOKEN_ACTION, AUTH_VERIFY_USER_ACTION } = require('../../config/sqsOperationConfig');
const tokenHelper = require('./tokenHelper');

const authenticate = async (req, res, next) => {
    try {
        // Extract Access Token from Cookies or Authorization Header
        let accessToken = req.cookies?.accessToken;
        
        if (!accessToken && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith("Bearer ")) {
                accessToken = authHeader.split(" ")[1]; // Extract token from "Bearer <token>"
            }
        }

        // Extract Refresh Token from Cookies or Header
        let refreshToken = req.headers?.authorization || req.headers["x-refresh-token"];
        
        // console.log("Extracted Tokens =>", { accessToken, refreshToken });

        if (!accessToken && !refreshToken) {
            return next(new AppError('No authentication tokens provided', 401, 'AUTH_REQUIRED'));
        }

        let decodedToken;
        let isAccessTokenValid = false;

        if (accessToken) {
            console.log(`Access token: ${accessToken}`);
            try {
                decodedToken = tokenHelper.verifyToken(accessToken);
                console.log(`Access token valid: ${decodedToken}`);
                isAccessTokenValid = true;
            } catch (error) {
                logger.info(`Access token invalid or expired: ${error.message}`);
                isAccessTokenValid = false;
            }
        }

        if (!isAccessTokenValid && refreshToken) {
            const serviceId = uuidv4();
            await storeUniqueId(serviceId, 'scheduler-service', 'auth-queue', 15, { refreshToken });

            await sendAuthEvent(AUTH_REFRESH_TOKEN_ACTION, { refreshToken, serviceId });
            const authResponse = await receiveAuthResponse(serviceId, 25000);

            if (!authResponse || authResponse?.status !== 'success') {
                return next(new AppError('Failed to refresh authentication token', 401, 'AUTH_FAILED'));
            }

            res.setHeader('Authorization', `Bearer ${authResponse?.tokens?.refreshToken}`);
            if (authResponse?.tokens?.accessToken) {
                res.cookie('accessToken', authResponse?.tokens?.accessToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 15 * 24 * 60 * 60 * 1000
                });
            }

            decodedToken = tokenHelper.verifyToken(authResponse?.tokens?.accessToken);
            isAccessTokenValid = true;
        }

        if (!isAccessTokenValid) {
            return next(new AppError('Authentication failed - invalid or expired tokens', 401, 'AUTH_FAILED'));
        }

        // const serviceId = uuidv4();
        // await storeUniqueId(serviceId, 'scheduler-service', 'auth-queue', 15, { userId: decodedToken.userId });

        // await sendAuthEvent(AUTH_VERIFY_USER_ACTION, { userId: decodedToken.userId, serviceId });
        // const userVerificationResponse = await receiveAuthResponse(serviceId, 25000);

        // if (!userVerificationResponse || userVerificationResponse?.status !== 'success') {
        //     return next(new AppError('User account is inactive or suspended', 403, 'USER_INACTIVE'));
        // }

        req.user = {
            userId: decodedToken.userId,
            email: decodedToken.email,
            role: decodedToken.role,
            permissions: decodedToken.permissions || [],
            subscription: decodedToken?.subscription || null
        };

        console.log(`Authenticated user: ${JSON.stringify(req.user)}`);

        next();
    } catch (error) {
        logger.error(`Authentication error: ${error.message}`, { stack: error.stack });
        next(new AppError('Authentication failed - server error', 500, 'AUTH_SERVER_ERROR'));
    }
};

module.exports = authenticate;