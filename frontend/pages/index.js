import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-white text-black p-6 flex items-center justify-center">
      <div className="max-w-xl text-center">
        <h1 className="text-4xl font-bold mb-4">Your AI Camping Planner</h1>
        <p className="mb-6 text-gray-600">Plan smarter. Pack faster. Camp happier.</p>
        <button
          onClick={() => router.push("/plan")}
          className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 transition"
        >
          Start Planning
        </button>
      </div>
    </main>
  );
}
