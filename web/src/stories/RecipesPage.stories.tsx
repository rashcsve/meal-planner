import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RecipesPage } from "../features/recipes/RecipesPage";
import { mockApi, type MockRoute } from "./mockApi";
import { expectNoCaps } from "./expectNoCaps";

const RECIPES = /\/api\/recipes$/;

function recipe(
  id: number,
  title: string,
  time: number,
  kcalPerServing: number | null,
  cost: number,
) {
  return {
    id,
    title,
    description: null,
    meal: "dinner",
    cuisine: "czech",
    proteinSource: null,
    diet: "vegetarian",
    source: null,
    time,
    cost,
    servings: 4,
    kcalPerServing,
  };
}

const recipes = [
  recipe(1, "Spinach omelette", 12, 480, 90),
  recipe(2, "Lentil soup", 25, 520, 40),
  recipe(3, "Potato pancakes", 40, 450, 120),
];

function cardTitles(root: HTMLElement) {
  return within(root)
    .getAllByRole("heading", { level: 2 })
    .map((h) => h.textContent);
}

let api: ReturnType<typeof mockApi>;

function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/recipes"]}>
        <Routes>
          <Route path="/recipes/:id?" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof RecipesPage> = {
  title: "features/recipes/RecipesPage",
  component: RecipesPage,
  decorators: [
    (Story) => (
      <Providers>
        <Story />
      </Providers>
    ),
  ],
  beforeEach: ({ parameters }) => {
    api = mockApi([parameters.recipesRoute as MockRoute]);
    return () => api.restore();
  },
};

export default meta;
type Story = StoryObj<typeof RecipesPage>;

export const Loaded: Story = {
  parameters: { recipesRoute: { method: "GET", path: RECIPES, body: recipes } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("link", { name: /Spinach omelette/ });
    await expect(canvas.getByRole("heading", { level: 1, name: "Recipes" })).toBeInTheDocument();
    await expect(canvas.getByText("3 recipes")).toBeInTheDocument();
    await expect(canvas.queryByRole("table")).not.toBeInTheDocument();
    await expect(cardTitles(canvasElement)).toEqual([
      "Lentil soup",
      "Potato pancakes",
      "Spinach omelette",
    ]);
    const card = canvas.getByRole("link", { name: /Spinach omelette/ });
    await expect(card).toHaveAttribute("href", "/recipes/1");
    const inCard = within(card);
    await expect(inCard.getByText("480 kcal a portion · 12 min")).toBeInTheDocument();
    await expect(inCard.getByText("Czech")).toBeInTheDocument();
    await expect(inCard.getByText("Vegetarian")).toBeInTheDocument();
    await expectNoCaps(canvasElement);
  },
};

export const SortBy: Story = {
  parameters: { recipesRoute: { method: "GET", path: RECIPES, body: recipes } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("link", { name: /Spinach omelette/ });
    const select = canvas.getByRole("combobox", { name: "Sort by" });
    await expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Name A–Z", "Quickest first", "Fewest kcal first", "Cheapest first"]);
    await userEvent.selectOptions(select, "Quickest first");
    await expect(cardTitles(canvasElement)).toEqual([
      "Spinach omelette",
      "Lentil soup",
      "Potato pancakes",
    ]);
    await userEvent.selectOptions(select, "Fewest kcal first");
    await expect(cardTitles(canvasElement)).toEqual([
      "Potato pancakes",
      "Spinach omelette",
      "Lentil soup",
    ]);
    await userEvent.selectOptions(select, "Cheapest first");
    await expect(cardTitles(canvasElement)).toEqual([
      "Lentil soup",
      "Spinach omelette",
      "Potato pancakes",
    ]);
  },
};

export const UnknownKcal: Story = {
  parameters: {
    recipesRoute: {
      method: "GET",
      path: RECIPES,
      body: [recipe(4, "Bean stew", 25, null, 60)],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = await canvas.findByRole("link", { name: /Bean stew/ });
    await expect(within(card).getByText("25 min")).toBeInTheDocument();
    await expect(card).not.toHaveTextContent(/kcal/);
  },
};

export const Loading: Story = {
  parameters: {
    recipesRoute: { method: "GET", path: RECIPES, body: () => new Promise(() => {}) },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1, name: "Recipes" })).toBeInTheDocument();
    await expect(canvas.getByRole("status", { name: "Loading recipes" })).toBeInTheDocument();
  },
};

export const LoadError: Story = {
  parameters: {
    recipesRoute: {
      method: "GET",
      path: RECIPES,
      status: 500,
      body: { error: { message: "Server down" } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent("Couldn't load recipes");
    await expect(canvas.getByRole("heading", { level: 1, name: "Recipes" })).toBeInTheDocument();
  },
};

export const Empty: Story = {
  parameters: { recipesRoute: { method: "GET", path: RECIPES, body: [] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("No recipes yet.");
    await expect(canvas.getByRole("heading", { level: 1, name: "Recipes" })).toBeInTheDocument();
    await expect(canvas.queryByText(/\d+ recipes?$/)).not.toBeInTheDocument();
  },
};

export const AddTile: Story = {
  parameters: { recipesRoute: { method: "GET", path: RECIPES, body: recipes } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const firstCard = await canvas.findByRole("link", { name: /Lentil soup/ });
    const tile = canvas.getByRole("button", { name: /^Add a recipe/ });
    await expect(tile).toHaveTextContent("Name, ingredients, minutes");
    await expect(tile.parentElement).toBe(firstCard.parentElement);
    await expect(tile.parentElement?.firstElementChild).toBe(tile);
    await expect(canvas.queryByRole("button", { name: "Add recipe" })).not.toBeInTheDocument();
    await expect(cardTitles(canvasElement)).toEqual([
      "Lentil soup",
      "Potato pancakes",
      "Spinach omelette",
    ]);

    await expect(tile).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(tile);
    await expect(tile).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByRole("textbox", { name: "Title" })).toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    await expect(canvas.queryByRole("textbox", { name: "Title" })).not.toBeInTheDocument();
    await expect(tile).toHaveAttribute("aria-expanded", "false");
    await expectNoCaps(canvasElement);
  },
};

export const EmptyHasAddTile: Story = {
  parameters: { recipesRoute: { method: "GET", path: RECIPES, body: [] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("No recipes yet.");
    const tile = canvas.getByRole("button", { name: /^Add a recipe/ });
    await userEvent.click(tile);
    await expect(canvas.getByRole("textbox", { name: "Title" })).toBeInTheDocument();
  },
};

export const NoMatchHasAddTile: Story = {
  parameters: { recipesRoute: { method: "GET", path: RECIPES, body: recipes } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("link", { name: /Spinach omelette/ });
    await userEvent.type(canvas.getByRole("searchbox", { name: "Search" }), "zzz");
    await canvas.findByText("No recipes match your search.");
    await expect(canvas.getByRole("button", { name: /^Add a recipe/ })).toBeInTheDocument();
  },
};

export const FilterChipsRow: Story = {
  parameters: { recipesRoute: { method: "GET", path: RECIPES, body: recipes } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("link", { name: /Spinach omelette/ });
    const group = canvas.getByRole("group", { name: "Filter recipes" });
    const search = canvas.getByPlaceholderText("Search…");
    await expect(group.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      search.getBoundingClientRect().bottom,
    );
    await expect(within(group).getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};

const unevenRecipes = [
  { ...recipe(5, "Soup", 20, 300, 50), cuisine: null, diet: null },
  {
    ...recipe(
      6,
      "Slow-roasted tomato and white bean stew with garlic bread and herbs",
      60,
      610,
      140,
    ),
    cuisine: "italian",
    proteinSource: "fish",
  },
  { ...recipe(7, "Chicken paprikash", 35, 540, 110), proteinSource: "chicken" },
];

function gridItemHeights(root: HTMLElement) {
  const tile = within(root).getByRole("button", { name: /^Add a recipe/ });
  return [...(tile.parentElement?.children ?? [])].map((el) => el.getBoundingClientRect().height);
}

export const EqualCardHeights: Story = {
  parameters: { recipesRoute: { method: "GET", path: RECIPES, body: unevenRecipes } },
  render: () => (
    <div style={{ width: 600 }}>
      <RecipesPage />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("link", { name: /Chicken paprikash/ });
    const before = gridItemHeights(canvasElement);
    await expect(before).toHaveLength(4);
    await expect(new Set(before).size).toBe(1);

    await userEvent.click(canvas.getByRole("button", { name: "Fish" }));
    const after = gridItemHeights(canvasElement);
    await expect(after).toHaveLength(2);
    await expect(after).toEqual([before[0], before[0]]);
  },
};
