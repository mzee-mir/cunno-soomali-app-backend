import crypto from "crypto";

const generateResetToken = () => {
    return crypto.randomBytes(32).toString("hex"); // Generates a 64-character hex string
};
export default generateResetToken;