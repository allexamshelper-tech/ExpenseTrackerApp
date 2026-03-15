import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

// Supabase client for server-side checks
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER || "demo",
    pass: process.env.SMTP_PASS || "demo",
  },
});

// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP Connection Error:", error);
  } else {
    console.log("SMTP Server is ready to take our messages");
  }
});

// In-memory OTP store (use a DB in production)
const otpStore = new Map<string, { otp: string; expires: number; email: string }>();

const BRAND_PRIMARY = "#3E3C7A";
const BRAND_ACCENT = "#F3A61C";

const getEmailTemplate = (title: string, content: string) => `
  <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <div style="background-color: ${BRAND_PRIMARY}; padding: 40px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">ExpenseTracker</h1>
    </div>
    <div style="padding: 40px; background-color: white;">
      <h2 style="color: #111827; margin-top: 0; font-size: 24px; font-weight: 700;">${title}</h2>
      <div style="color: #4b5563; line-height: 1.6; font-size: 16px;">
        ${content}
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f3f4f6; text-align: center; color: #9ca3af; font-size: 12px;">
        &copy; 2026 ExpenseTracker. All rights reserved.
      </div>
    </div>
  </div>
`;

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.post("/api/email/welcome", async (req, res) => {
    const { email, name, details } = req.body;
    console.log(`Attempting to send welcome email to ${email}`);
    try {
      const html = getEmailTemplate(
        "Welcome to ExpenseTracker!",
        `<p>Hi <strong>${name}</strong>,</p>
         <p>Thank you for joining ExpenseTracker. We're excited to help you manage your finances better!</p>
         <p><strong>Your Account Details:</strong></p>
         <div style="background-color: #f9fafb; padding: 15px; border-radius: 12px; margin: 15px 0; font-family: monospace;">
           ${details ? details.replace(/\n/g, '<br>') : `Email: ${email}`}
         </div>
         <p>You can now start adding your income, expenses, and setting budgets to stay on track.</p>
         <div style="margin-top: 30px; text-align: center;">
           <a href="${process.env.APP_URL || 'http://localhost:3000'}" style="background-color: ${BRAND_ACCENT}; color: white; padding: 14px 32px; border-radius: 16px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 4px 14px 0 rgba(243, 166, 28, 0.39);">Go to Dashboard</a>
         </div>`
      );

      const info = await transporter.sendMail({
        from: '"ExpenseTracker" <noreply@expensetracker.com>',
        to: email,
        subject: "Welcome to ExpenseTracker!",
        html,
      });

      console.log("Welcome email sent:", info.messageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Welcome email error:", error);
      res.status(500).json({ message: "Failed to send welcome email" });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { identifier } = req.body;
    console.log(`Forgot password request for: ${identifier}`);
    try {
      // Search for user by email or phone in profiles table
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("email, name, phone")
        .or(`email.eq.${identifier},phone.eq.${identifier}`)
        .maybeSingle();

      if (error) {
        console.error("Supabase profile lookup error:", error);
        throw error;
      }

      if (!profiles) {
        console.log(`User not found in profiles for identifier: ${identifier}`);
        return res.status(404).json({ message: "User not found. Please check your email or mobile number." });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore.set(identifier, { otp, expires, email: profiles.email });

      const html = getEmailTemplate(
        "Password Reset OTP",
        `<p>Hi ${profiles.name},</p>
         <p>You requested to reset your password. Use the following OTP to proceed:</p>
         <div style="background-color: #f3f4f6; padding: 30px; border-radius: 16px; text-align: center; margin: 24px 0;">
           <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: ${BRAND_PRIMARY};">${otp}</span>
         </div>
         <p>This OTP will expire in 10 minutes. If you didn't request this, please ignore this email.</p>`
      );

      const info = await transporter.sendMail({
        from: '"ExpenseTracker Security" <security@expensetracker.com>',
        to: profiles.email,
        subject: "Password Reset OTP",
        html,
      });

      console.log("OTP email sent:", info.messageId);
      res.json({ success: true, message: "OTP sent to registered email" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { identifier, otp, newPassword } = req.body;
    const stored = otpStore.get(identifier);

    if (!stored || stored.otp !== otp || Date.now() > stored.expires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    try {
      // Update password in Supabase Auth (requires admin/service role or user session)
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', stored.email)
        .single();

      if (profileError || !userProfile) {
        console.error("Profile lookup error during reset:", profileError);
        return res.status(404).json({ message: "User profile not found" });
      }

      const { error } = await supabase.auth.admin.updateUserById(
        userProfile.id,
        { password: newPassword }
      );

      if (error) {
        console.error("Supabase admin update error:", error);
        throw error;
      }

      otpStore.delete(identifier);
      res.json({ success: true, message: "Password reset successful" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
