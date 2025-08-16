import formidable from "formidable";
import fs from "fs";
import FormData from "form-data";

export const config = {
  api: {
    bodyParser: false, // WAJIB di Vercel
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: "Form parse error" });
    }

    try {
      const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
      const filePath = uploadedFile.filepath;

      const fileStream = fs.createReadStream(filePath);

      const formData = new FormData();
      formData.append("reqtype", "fileupload");
      formData.append("fileToUpload", fileStream, uploadedFile.originalFilename);

      const uploadRes = await fetch("https://catbox.moe/user/api.php", {
        method: "POST",
        body: formData,
        headers: formData.getHeaders(),
      });

      const link = await uploadRes.text();

      return res.status(200).json({ link: link.trim() });
    } catch (e) {
      return res.status(500).json({ error: "Upload gagal", detail: e.message });
    }
  });
}
