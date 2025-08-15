require("dotenv").config();
const axios = require("axios");

const USERNAME = "youcefkharchi2";
const REPO = "bot-ticket-by-touni-test";
const BRANCH = "main";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // من .env

module.exports = async function uploadToGitHub(path, content) {
  if (!GITHUB_TOKEN) {
    console.error("❌ مفيش GITHUB_TOKEN في .env");
    return;
  }

  // اختبار التوكن
  try {
    const testRes = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json"
      }
    });
    console.log(`🔑 Token valid. Logged in as: ${testRes.data.login}`);
  } catch (err) {
    console.error("❌ التوكن غير صحيح أو الصلاحيات ناقصة:", err.response?.data || err.message);
    return;
  }

  const apiUrl = `https://api.github.com/repos/${USERNAME}/${REPO}/contents/docs/${path}`;

  try {
    let sha = null;

    // تحقق إذا الملف موجود
    try {
      const res = await axios.get(apiUrl, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json"
        }
      });
      sha = res.data.sha;
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error("❌ Failed to check existing file:", err.response?.data || err.message);
        return;
      }
    }

    // رفع الملف
    const res = await axios.put(
      apiUrl,
      {
        message: `Upload transcript: ${path}`,
        content: Buffer.from(content).toString("base64"),
        branch: BRANCH,
        ...(sha && { sha })
      },
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json"
        }
      }
    );

    console.log(`✅ File uploaded to GitHub Pages: ${res.data.content.path}`);
  } catch (err) {
    console.error("❌ GitHub upload error:", err.response?.data || err.message);
  }
};