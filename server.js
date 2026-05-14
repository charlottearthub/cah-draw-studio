const express = require("express");
const path = require("path");
const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;

const app = express();

const PORT = process.env.PORT || 3000;

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || "charlottearthub";
const GITHUB_REPO = process.env.GITHUB_REPO || "cah-draw-studio";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const DRAWING_APPROVAL_PATH = process.env.DRAWING_APPROVAL_PATH || "data/pending-drawings.json";

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});

app.use(express.json({ limit: "30mb" }));
app.use(express.static(path.join(__dirname)));

function required(value, label) {
  if (!value) {
    throw new Error(`${label} is not configured.`);
  }
}

function cleanText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, 1000);
}

function cleanShortText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, 160);
}

function makeSubmissionId() {
  const date = new Date();
  const stamp = date.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = crypto.randomBytes(4).toString("hex");
  return `draw_${stamp}_${random}`;
}

function githubApiUrl(filePath) {
  return `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
}

async function getPendingFile() {
  const response = await fetch(`${githubApiUrl(DRAWING_APPROVAL_PATH)}?ref=${GITHUB_BRANCH}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "CAH-Draw-Studio"
    }
  });

  if (response.status === 404) {
    return {
      sha: null,
      submissions: []
    };
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Could not read pending drawings file: ${response.status} ${text}`);
  }

  const data = await response.json();
  const decoded = Buffer.from(data.content || "", "base64").toString("utf8");

  let parsed = [];

  try {
    parsed = JSON.parse(decoded);
  } catch (error) {
    parsed = [];
  }

  if (!Array.isArray(parsed)) {
    parsed = [];
  }

  return {
    sha: data.sha,
    submissions: parsed
  };
}

async function savePendingFile(submissions, sha) {
  const content = Buffer.from(JSON.stringify(submissions, null, 2)).toString("base64");

  const body = {
    message: "Add pending Draw Studio submission",
    content,
    branch: GITHUB_BRANCH
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(githubApiUrl(DRAWING_APPROVAL_PATH), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "CAH-Draw-Studio"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Could not save pending drawings file: ${response.status} ${text}`);
  }

  return response.json();
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "CAH Draw Studio",
    time: new Date().toISOString()
  });
});

app.post("/api/drawing-submissions", async (req, res) => {
  try {
    required(CLOUDINARY_CLOUD_NAME, "CLOUDINARY_CLOUD_NAME");
    required(CLOUDINARY_API_KEY, "CLOUDINARY_API_KEY");
    required(CLOUDINARY_API_SECRET, "CLOUDINARY_API_SECRET");
    required(GITHUB_TOKEN, "GITHUB_TOKEN");

    const {
      imageDataUrl,
      artistName,
      contact,
      title,
      description,
      ageGroup,
      guardianName,
      permissionConfirmed
    } = req.body || {};

    if (!imageDataUrl || typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/png;base64,")) {
      return res.status(400).json({
        ok: false,
        error: "Missing valid PNG drawing image."
      });
    }

    if (!permissionConfirmed) {
      return res.status(400).json({
        ok: false,
        error: "Permission must be confirmed before submission."
      });
    }

    const submissionId = makeSubmissionId();

    const uploadResult = await cloudinary.uploader.upload(imageDataUrl, {
      folder: "charlotte-art-hub/draw-studio/pending",
      public_id: submissionId,
      resource_type: "image",
      overwrite: false
    });

    const submission = {
      id: submissionId,
      type: "drawing_app_submission",
      status: "pending",
      source: "CAH Draw Studio",
      artistName: cleanShortText(artistName, "Unknown Artist"),
      contact: cleanShortText(contact),
      title: cleanShortText(title, "Untitled Drawing"),
      description: cleanText(description),
      medium: "Digital drawing",
      ageGroup: cleanShortText(ageGroup, "Not specified"),
      guardianName: cleanShortText(guardianName),
      permissionConfirmed: Boolean(permissionConfirmed),
      imageUrl: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      submittedAt: new Date().toISOString()
    };

    const pendingFile = await getPendingFile();
    const updatedSubmissions = [submission, ...pendingFile.submissions];

    await savePendingFile(updatedSubmissions, pendingFile.sha);

    res.json({
      ok: true,
      message: "Drawing submitted for review.",
      submission
    });
  } catch (error) {
    console.error("Drawing submission failed:", error);

    res.status(500).json({
      ok: false,
      error: "Drawing submission failed."
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`CAH Draw Studio server running on port ${PORT}`);
});
