import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Table,
  type ColumnDef,
  type SortDirection,
} from "../../shared/ui/Table";
import { Skeleton } from "../../shared/ui/Skeleton";
import { ErrorState } from "../../shared/ui/ErrorState";
import { Pill } from "../../shared/ui/Pill";
import { SearchInput } from "../../shared/ui/SearchInput";
import { Filters } from "../../shared/ui/Filters";
import { Button } from "../../shared/ui/Button";
import { compareValues } from "../../shared/lib/compareValues";
import { normalizeForSearch } from "../../shared/lib/normalizeText";
import { formatTime } from "../../shared/lib/formatTime";
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

const columns: ColumnDef<Recipe>[] = [
  {
    key: "title",
    header: "Recipe",
    sortable: true,
    primary: true,
    render: (r) => r.title,
  },
  {
    key: "meal",
    header: "Meal",
    width: "70px",
    sortable: true,
    render: (r) => r.meal ?? "—",
  },
  {
    key: "tags",
    header: "Tags",
    width: "180px",
    render: (r) => (
      <div className="flex flex-wrap gap-1">
        {[r.cuisine, r.proteinSource, r.diet]
          .filter((tag): tag is string => Boolean(tag))
          .map((tag) => (
            <Pill key={tag}>{tag}</Pill>
          ))}
      </div>
    ),
  },
  {
    key: "time",
    header: "Time",
    align: "right",
    width: "70px",
    sortable: true,
    render: (r) => formatTime(r.time),
  },
  {
    key: "kcalPerServing",
    header: "Kcal/serving",
    align: "right",
    width: "92px",
    sortable: true,
    render: (r) => r.kcalPerServing ?? "—",
  },
  {
    key: "cost",
    header: "Cost",
    align: "right",
    width: "70px",
    sortable: true,
    render: (r) => (r.cost != null ? `${r.cost},-` : "—"),
  },
  {
    key: "source",
    header: "Source",
    width: "120px",
    sortable: true,
    render: (r) => r.source ?? "—",
  },
];

export function RecipesPage() {
  const { id } = useParams<{ id: string }>();
  const recipeId = id ? Number(id) : undefined;
  const navigate = useNavigate();

  const { data, isLoading, error } = useRecipes();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterValue[]>(["all"]);
  const [sortKey, setSortKey] = useState("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
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
    return data.filter(
      (r) => matchesFilters(r, filters) && matchesSearch(r, query),
    );
  }, [data, search, filters]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      const cmp = compareValues(
        a[sortKey as keyof Recipe],
        b[sortKey as keyof Recipe],
      );
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [filtered, sortKey, sortDirection]);

  function handleSortChange(key: string, direction: SortDirection) {
    setSortKey(key);
    setSortDirection(direction);
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-auto p-3.5">
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-auto p-3.5">
        <ErrorState title="Couldn't load recipes" message={error.message} />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto p-3.5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
            />
            <Filters
              options={FILTER_OPTIONS}
              value={filters}
              onChange={handleFilterChange}
              multiple
            />
            <div className="ml-auto">
              <Button
                aria-expanded={showForm}
                onClick={() => setShowForm((v) => !v)}
              >
                {showForm ? "Cancel" : "Add recipe"}
              </Button>
            </div>
          </div>
          {showForm && (
            <RecipeForm
              onSaved={() => setShowForm(false)}
              onCancel={() => setShowForm(false)}
            />
          )}
          <div data-detail-rail-ignore>
            <Table
              rows={sorted}
              columns={columns}
              rowId={(r) => r.id}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              onRowClick={(r) =>
                navigate(r.id === recipeId ? "/recipes" : `/recipes/${r.id}`)
              }
            />
          </div>
        </div>
      </div>
      {recipeId != null && (
        <RecipeDetail id={recipeId} onClose={() => navigate("/recipes")} />
      )}
    </div>
  );
}
