import { useEffect, useState, type SubmitEvent } from "react";

type Recipe = {
  id: number;
  title: string;
  minutes: number;
};

const API_URL = import.meta.env.VITE_API_URL;

async function getErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error?.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRecipes() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/recipes`);
      if (!res.ok) throw new Error(await getErrorMessage(res));
      setRecipes(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recipes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecipes();
  }, []);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title"));
    const minutes = Number(data.get("minutes"));

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, minutes }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res));
      form.reset();
      await loadRecipes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create recipe");
      setLoading(false);
    }
  }

  return (
    <div
      style={{ maxWidth: 480, margin: "2rem auto", fontFamily: "sans-serif" }}
    >
      <h1>Recipes</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom: "1.5rem" }}>
        <input name="title" placeholder="Title" required />
        <input
          name="minutes"
          type="number"
          placeholder="Minutes"
          min={1}
          required
        />
        <button type="submit" disabled={loading}>
          Add
        </button>
      </form>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {!loading && !error && (
        <ul>
          {recipes.map((r) => (
            <li key={r.id}>
              {r.title} — {r.minutes} min
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
