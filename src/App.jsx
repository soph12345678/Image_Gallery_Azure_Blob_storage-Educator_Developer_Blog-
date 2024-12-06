import { useEffect, useState } from "react";
import "./App.css";
import { AiFillDelete } from "react-icons/ai";
import { FaFileUpload } from "react-icons/fa";
import Placeholder from "./assets/placeholder.jpeg";
import Loading from "./components/Loading";
import { BlobServiceClient } from "@azure/storage-blob";

const App = () => {
  const [file, setFile] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(false);

  // Azure Storage credentials
  const account = import.meta.env.VITE_STORAGE_ACCOUNT;
  const sasToken = import.meta.env.VITE_STORAGE_SAS;
  const containerName = import.meta.env.VITE_STORAGE_CONTAINER;

  const blobServiceClient = new BlobServiceClient(
    `https://${account}.blob.core.windows.net/?${sasToken}`
  );
  const containerClient = blobServiceClient.getContainerClient(containerName);

  // Fetch images from Azure Blob Storage
  const fetchImages = async () => {
    if (!account || !sasToken || !containerName) {
      alert(
        "Please make sure you have set the Azure Storage credentials in the .env file"
      );
      return;
    }

    try {
      setLoading(true);
      const blobItems = containerClient.listBlobsFlat();
      const urls = [];
      for await (const blob of blobItems) {
        const tempBlockBlobClient = containerClient.getBlockBlobClient(blob.name);
        urls.push({ name: blob.name, url: tempBlockBlobClient.url });
      }
      setImageUrls(urls);
    } catch (error) {
      console.error("Error fetching images:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Upload image to Azure Blob Storage
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please select an image to upload");
      return;
    }

    try {
      setLoading(true);
      const blobName = `${new Date().getTime()}-${file.name}`;
      const blobClient = containerClient.getBlockBlobClient(blobName);

      // Upload the file
      await blobClient.uploadData(file, {
        blobHTTPHeaders: { blobContentType: file.type },
      });

      // Fetch updated list of images
      await fetchImages();
      alert("Image uploaded successfully!");
    } catch (error) {
      console.error("Error uploading image:", error.message);
    } finally {
      setLoading(false);
      setFile(null); // Reset the file input
    }
  };

  // Delete an image from Azure Blob Storage
  const handleDelete = async (blobName) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;

    try {
      setLoading(true);
      const blobClient = containerClient.getBlockBlobClient(blobName);

      // Delete the file
      await blobClient.delete();

      // Fetch updated list of images
      await fetchImages();
      alert("Image deleted successfully!");
    } catch (error) {
      console.error("Error deleting image:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch images on page load
  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <div className="container">
      {loading && <Loading />}
      <h2 className="heading">📸 My Chronify Gallery 📸</h2>
      <hr />

      {/* Upload Form */}
      <div className="row-form">
        <form className="upload-form">
          <div className="upload-form_display">
            {file ? (
              <img
                className="displayImg"
                src={URL.createObjectURL(file)}
                alt="Selected"
              />
            ) : (
              <img className="displayImg" src={Placeholder} alt="Placeholder" />
            )}
          </div>
          <div className="upload-form_inputs">
            <label htmlFor="fileInput" className="upload-label">
              <FaFileUpload />
            </label>
            <input
              type="file"
              style={{ display: "none" }}
              id="fileInput"
              onChange={(e) => setFile(e.target.files[0])}
            />
            <button className="upload-btn" type="submit" onClick={handleSubmit}>
              Upload
            </button>
          </div>
        </form>
      </div>

      {/* Image List */}
      <div className="row-display">
        {imageUrls.length === 0 ? (
          <h3>😐 No Images Found 😐</h3>
        ) : (
          imageUrls.map((blobItem, index) => (
            <div key={index} className="card">
              <img className="card-img" src={blobItem.url} alt={blobItem.name} />
              <h3 className="card-title">{blobItem.name}</h3>
              <button
                className="del-btn"
                onClick={() => handleDelete(blobItem.name)}
              >
                <AiFillDelete />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default App;
