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
