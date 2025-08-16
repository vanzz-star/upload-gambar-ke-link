import { useState } from "react";

export default function Home() {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.link) setLink(data.link);
      else alert("Upload gagal");
    } catch (err) {
      console.error(err);
      alert("Error upload");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    alert("Link disalin!");
  };

  return (
    <div
      className="h-screen flex flex-col justify-center items-center bg-cover bg-center"
      style={{ backgroundImage: "url('https://files.catbox.moe/8o5gnw.png')" }}
    >
      <div className="bg-white/80 p-6 rounded-2xl shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-4">Upload ke Catbox</h1>
        <input type="file" onChange={handleUpload} className="mb-4" />
        {loading && <p>Uploading...</p>}
        {link && (
          <div>
            <p className="mb-2">✅ File terupload:</p>
            <a href={link} target="_blank" rel="noreferrer" className="text-blue-600 underline">
              {link}
            </a>
            <br />
            <button
              onClick={copyLink}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Copy Link
            </button>
          </div>
        )}
        <p className="mt-4 text-gray-600">By VanzzCloud</p>
      </div>
    </div>
  );
}
