import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Skeleton } from "../../shared/ui/Skeleton";
import { ErrorState } from "../../shared/ui/ErrorState";
import { EmptyState } from "../../shared/ui/EmptyState";
import { DishPhoto } from "../../shared/ui/DishPhoto";
import { Select } from "../../shared/ui/Select";
import { SearchInput } from "../../shared/ui/SearchInput";
import { Filters } from "../../shared/ui/Filters";
import { compareValues } from "../../shared/lib/compareValues";
import { normalizeForSearch } from "../../shared/lib/normalizeText";
import { useRecipes, type Recipe } from "./useRecipes";
import { RecipeForm } from "./RecipeForm";
import { RecipeDetail } from "./RecipeDetail";

type FilterValue =
  | "all"
  | "lunchdinner"
  | "breakfast"
  | "fish"
  | "chicken"
  | "czech"
  | "italian"
  | "russian"
  | "fast";

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "lunchdinner", label: "Lunch/Dinner" },
  { value: "breakfast", label: "Breakfast" },
  { value: "fish", label: "Fish" },
  { value: "chicken", label: "Chicken" },
  { value: "czech", label: "Czech" },
  { value: "italian", label: "Italian" },
  { value: "russian", label: "Russian" },
  { value: "fast", label: "<30 min" },
];

function matchesFilter(recipe: Recipe, filter: FilterValue): boolean {
  switch (filter) {
    case "all":
      return true;
    case "lunchdinner":
      return recipe.meal === "lunch" || recipe.meal === "dinner";
    case "breakfast":
      return recipe.meal === "breakfast";
    case "fish":
      return recipe.proteinSource === "fish";
    case "chicken":
      return recipe.proteinSource === "chicken";
    case "czech":
      return recipe.cuisine === "czech";
    case "italian":
      return recipe.cuisine === "italian";
    case "russian":
      return recipe.cuisine === "russian";
    case "fast":
      return recipe.time < 30;
  }
}

function matchesFilters(recipe: Recipe, filters: FilterValue[]): boolean {
  if (filters.length === 0 || filters.includes("all")) return true;
  return filters.every((f) => matchesFilter(recipe, f));
}

function matchesSearch(recipe: Recipe, query: string): boolean {
  if (!query) return true;
  const haystack = [
    recipe.title,
    recipe.description,
    recipe.meal,
    recipe.cuisine,
    recipe.proteinSource,
    recipe.diet,
    recipe.source,
  ]
    .filter((v): v is string => Boolean(v))
    .map(normalizeForSearch)
    .join(" ");
  return haystack.includes(query);
}

type SortKey = "title" | "time" | "kcalPerServing" | "cost";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "title", label: "Name A–Z" },
  { value: "time", label: "Quickest first" },
  { value: "kcalPerServing", label: "Fewest kcal first" },
  { value: "cost", label: "Cheapest first" },
];

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function RecipeCard({ recipe, href }: { recipe: Recipe; href: string }) {
  const kcal =
    recipe.kcalPerServing != null ? `${Math.round(recipe.kcalPerServing)} kcal a portion · ` : "";
  const tags = [recipe.cuisine, recipe.proteinSource, recipe.diet].filter((tag): tag is string =>
    Boolean(tag),
  );
  return (
    <Link
      to={href}
      className="flex flex-col overflow-hidden rounded-card border border-divider bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lock"
    >
      <div aria-hidden className="h-36">
        <DishPhoto name={recipe.title} />
      </div>
      <div className="flex flex-col gap-2 p-4">
        <h2 className="type-section text-ink">{recipe.title}</h2>
        <p className="type-small text-muted">{`${kcal}${recipe.time} min`}</p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-tag bg-fill px-1.5 py-px text-12 font-semibold text-ink"
              >
                {sentenceCase(tag)}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

function AddRecipeTile({ expanded, onClick }: { expanded: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onClick}
      className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-border bg-page p-4 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lock"
    >
      <span
        aria-hidden
        className="mb-1 flex size-11 items-center justify-center rounded-control bg-surface text-18 text-ink"
      >
        +
      </span>
      <span className="type-section text-ink">Add a recipe</span>
      <span className="type-small text-muted">Name, ingredients, minutes</span>
    </button>
  );
}

function RecipesHeader({ count }: { count?: number }) {
  return (
    <header>
      {count != null && count > 0 && (
        <p className="type-label">{count === 1 ? "1 recipe" : `${count} recipes`}</p>
      )}
      <h1 className="type-page-title text-ink">Recipes</h1>
    </header>
  );
}

export function RecipesPage() {
  const { id } = useParams<{ id: string }>();
  const recipeId = id ? Number(id) : undefined;
  const navigate = useNavigate();

  const { data, isLoading, error } = useRecipes();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterValue[]>(["all"]);
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [showForm, setShowForm] = useState(false);

  function handleFilterChange(next: FilterValue[]) {
    const justAddedAll = next.includes("all") && !filters.includes("all");
    if (justAddedAll || next.length === 0) {
      setFilters(["all"]);
      return;
    }
    setFilters(next.filter((f) => f !== "all"));
  }

  const filtered = useMemo(() => {
    if (!data) return [];
    const query = normalizeForSearch(search.trim());
    return data.filter((r) => matchesFilters(r, filters) && matchesSearch(r, query));
  }, [data, search, filters]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => compareValues(a[sortKey], b[sortKey]));
    return rows;
  }, [filtered, sortKey]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-4 overflow-auto bg-page p-8">
        <RecipesHeader />
        <div role="status" aria-label="Loading recipes" className="flex flex-col gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col gap-4 overflow-auto bg-page p-8">
        <RecipesHeader />
        <ErrorState title="Couldn't load recipes" message={error.message} />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto bg-page p-8">
        <div className="flex flex-col gap-4">
          <RecipesHeader count={data?.length} />
          <div className="flex items-center gap-2">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
            />
            <label className="type-label flex items-center gap-2">
              Sort by
              <Select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <Filters
            aria-label="Filter recipes"
            options={FILTER_OPTIONS}
            value={filters}
            onChange={handleFilterChange}
            multiple
          />
          {showForm && (
            <RecipeForm onSaved={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
          )}
          <div data-detail-rail-ignore className="flex flex-col gap-4">
            {sorted.length === 0 && (
              <EmptyState
                message={
                  data && data.length > 0 ? "No recipes match your search." : "No recipes yet."
                }
                action={null}
              />
            )}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              <AddRecipeTile expanded={showForm} onClick={() => setShowForm((v) => !v)} />
              {sorted.map((r) => (
                <RecipeCard
                  key={r.id}
                  recipe={r}
                  href={r.id === recipeId ? "/recipes" : `/recipes/${r.id}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      {recipeId != null && <RecipeDetail id={recipeId} onClose={() => navigate("/recipes")} />}
    </div>
  );
}
