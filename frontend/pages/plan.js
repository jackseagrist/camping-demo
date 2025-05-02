import { useState } from "react";
import axios from "axios";

export default function Plan() {
  const [formData, setFormData] = useState({
    tripType: "",
    groupSize: 2,
    duration: 3,
    location: "",
    month: "",
    experienceLevel: "",
    sustainability: "yes",
  });

  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult("");

    try {
      const response = await axios.post("http://localhost:8000/packing-list/generate", formData);
      setResult(response.data.result);
    } catch (err) {
      setResult("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-xl mx-auto p-6 text-black">
      <h2 className="text-3xl font-bold mb-4">Plan Your Trip</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {["tripType", "location", "month", "experienceLevel", "sustainability"].map((field) => (
          <input
            key={field}
            name={field}
            placeholder={field}
            value={formData[field]}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded"
          />
        ))}
        <input
          name="groupSize"
          type="number"
          placeholder="Group Size"
          value={formData.groupSize}
          onChange={handleChange}
          className="w-full border border-gray-300 p-2 rounded"
        />
        <input
          name="duration"
          type="number"
          placeholder="Trip Duration (days)"
          value={formData.duration}
          onChange={handleChange}
          className="w-full border border-gray-300 p-2 rounded"
        />
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          {loading ? "Generating..." : "Generate Packing List"}
        </button>
      </form>
      {result && (
        <div className="mt-6 whitespace-pre-wrap border-t pt-4">{result}</div>
      )}
    </main>
  );
}
